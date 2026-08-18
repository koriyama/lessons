import { supabase } from './supabaseClient'

// ---------- helpers ----------

function makeSlug() {
  return Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4)
}

function assertNoError(error, context) {
  if (error) {
    console.error(context, error)
    throw new Error(`${context}: ${error.message}`)
  }
}

// ---------- lessons ----------

export async function listLessonsWithStats() {
  const { data: lessons, error } = await supabase
    .from('lessons')
    .select('*')
    .order('created_at', { ascending: false })
  assertNoError(error, 'Failed to load lessons')

  const { data: submissions, error: subError } = await supabase
    .from('submissions')
    .select('lesson_id, status, score, max_auto_score')
  assertNoError(subError, 'Failed to load submission stats')

  const statsByLesson = {}
  for (const s of submissions || []) {
    const bucket = (statsByLesson[s.lesson_id] ||= { completed: 0, scoreSum: 0, maxSum: 0 })
    if (s.status === 'completed') {
      bucket.completed += 1
      bucket.scoreSum += s.score || 0
      bucket.maxSum += s.max_auto_score || 0
    }
  }

  return (lessons || []).map((lesson) => {
    const stats = statsByLesson[lesson.id] || { completed: 0, scoreSum: 0, maxSum: 0 }
    const avgPercent = stats.maxSum > 0 ? Math.round((stats.scoreSum / stats.maxSum) * 100) : null
    return { ...lesson, completedCount: stats.completed, avgPercent }
  })
}

export async function getLesson(id) {
  const { data, error } = await supabase.from('lessons').select('*').eq('id', id).single()
  assertNoError(error, 'Failed to load lesson')
  return data
}

export async function getLessonBySlug(slug) {
  const { data, error } = await supabase
    .from('lessons')
    .select('*')
    .eq('share_slug', slug)
    .eq('status', 'published')
    .single()
  assertNoError(error, 'Lesson not found or not published')
  return data
}

export async function getDraftLessonBySlug(slug) {
  const { data, error } = await supabase
    .from('lessons')
    .select('*')
    .eq('share_slug', slug)
    .single()
  assertNoError(error, 'Lesson not found')
  return data
}

export async function createLesson(fields) {
  const { data, error } = await supabase
    .from('lessons')
    .insert({
      title: fields.title || 'Untitled lesson',
      level: fields.level || 'B1',
      reading_text: fields.reading_text || '',
      audio_url: fields.audio_url || null,
      images: fields.images || [],
      status: 'draft',
      share_slug: makeSlug()
    })
    .select()
    .single()
  assertNoError(error, 'Failed to create lesson')
  return data
}

export async function updateLesson(id, patch) {
  const { data, error } = await supabase
    .from('lessons')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  assertNoError(error, 'Failed to update lesson')
  return data
}

export async function setLessonStatus(id, status) {
  return updateLesson(id, { status })
}

export async function duplicateLesson(id) {
  const original = await getLesson(id)
  const sections = await listSections(id)
  const activities = await listActivities(id)
  const vocabulary = await listVocabulary(id)

  const copy = await createLesson({
    title: `${original.title} (copy)`,
    level: original.level,
    reading_text: original.reading_text,
    audio_url: original.audio_url,
    images: original.images
  })

  let newSections = []
  if (sections.length) {
    newSections = await saveSections(
      copy.id,
      sections.map(({ id: _drop, lesson_id: _drop2, ...rest }) => rest)
    )
  }
  const sectionIdMap = {}
  sections.forEach((old, i) => {
    if (newSections[i]) sectionIdMap[old.id] = newSections[i].id
  })

  if (activities.length) {
    await saveActivities(
      copy.id,
      activities.map(({ id: _drop, lesson_id: _drop2, section_id, ...rest }) => ({
        ...rest,
        section_id: section_id ? sectionIdMap[section_id] ?? null : null
      })),
      true // force = true to skip any confirmation
    )
  }
  if (vocabulary.length) {
    await saveVocabulary(
      copy.id,
      vocabulary.map(({ id: _drop, lesson_id: _drop2, ...rest }) => rest)
    )
  }
  return copy
}

// ---------- sections ----------

export async function listSections(lessonId) {
  const { data, error } = await supabase
    .from('sections')
    .select('*')
    .eq('lesson_id', lessonId)
    .order('position', { ascending: true })
  assertNoError(error, 'Failed to load sections')
  return data || []
}

export async function saveSections(lessonId, sections) {
  const { error: deleteError } = await supabase.from('sections').delete().eq('lesson_id', lessonId)
  assertNoError(deleteError, 'Failed to clear old sections')

  if (!sections.length) return []

  const rows = sections.map((s, index) => ({
    lesson_id: lessonId,
    title: s.title || '',
    intro_text: s.intro_text || '',
    position: index
  }))

  const { data, error } = await supabase.from('sections').insert(rows).select()
  assertNoError(error, 'Failed to save sections')
  return [...data].sort((a, b) => a.position - b.position)
}

// ---------- activities ----------

export async function listActivities(lessonId) {
  console.log('🔎 listActivities called with lessonId:', lessonId);
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .eq('lesson_id', lessonId)
    .order('position', { ascending: true });
  if (error) {
    console.error('❌ Supabase error in listActivities:', error);
    throw new Error(`Failed to load activities: ${error.message}`);
  }
  console.log('📊 listActivities returned:', data);
  return data || [];
}

export async function saveActivities(lessonId, activities, force = false) {
  // Delete all existing activities for this lesson
  const { error: deleteError } = await supabase.from('activities').delete().eq('lesson_id', lessonId)
  assertNoError(deleteError, 'Failed to clear old activities')

  if (!activities.length) return []

  const rows = activities.map((a, index) => ({
    lesson_id: lessonId,
    section_id: a.section_id ?? null,
    type: a.type,
    prompt: a.prompt,
    config: a.config || {},
    points: a.points ?? 1,
    position: index
  }))

  const { data, error } = await supabase.from('activities').insert(rows).select()
  assertNoError(error, 'Failed to save activities')
  return data
}

// ---------- vocabulary ----------

export async function listVocabulary(lessonId) {
  const { data, error } = await supabase
    .from('vocabulary')
    .select('*')
    .eq('lesson_id', lessonId)
    .order('position', { ascending: true })
  assertNoError(error, 'Failed to load vocabulary')
  return data || []
}

export async function saveVocabulary(lessonId, items) {
  const { error: deleteError } = await supabase.from('vocabulary').delete().eq('lesson_id', lessonId)
  assertNoError(deleteError, 'Failed to clear old vocabulary')

  if (!items.length) return []

  const rows = items.map((v, index) => ({
    lesson_id: lessonId,
    term: v.term,
    definition: v.definition,
    example: v.example || '',
    position: index
  }))

  const { data, error } = await supabase.from('vocabulary').insert(rows).select()
  assertNoError(error, 'Failed to save vocabulary')
  return data
}

// ---------- storage ----------

export async function uploadAudio(file) {
  const path = `audio/${Date.now()}-${file.name}`
  const { error } = await supabase.storage.from('lesson-media').upload(path, file, { upsert: false })
  assertNoError(error, 'Failed to upload audio')
  const { data } = supabase.storage.from('lesson-media').getPublicUrl(path)
  return data.publicUrl
}

export async function uploadImage(file) {
  const path = `images/${Date.now()}-${file.name}`
  const { error } = await supabase.storage.from('lesson-media').upload(path, file, { upsert: false })
  assertNoError(error, 'Failed to upload image')
  const { data } = supabase.storage.from('lesson-media').getPublicUrl(path)
  return data.publicUrl
}

// ---------- submissions & responses ----------

export async function startSubmission(lessonId, studentIdentifier) {
  const { data, error } = await supabase
    .from('submissions')
    .insert({
      lesson_id: lessonId,
      student_identifier: studentIdentifier,
      status: 'in_progress'
    })
    .select()
    .single()
  assertNoError(error, 'Failed to start submission')
  return data
}

export async function completeSubmission(submissionId, { score, maxAutoScore, responses }) {
  const { error: responseError } = await supabase.from('responses').insert(
    responses.map((r) => ({
      submission_id: submissionId,
      activity_id: r.activityId,
      response_text: r.responseText,
      auto_correct: r.autoCorrect,
      auto_score: r.score
    }))
  )
  assertNoError(responseError, 'Failed to save responses')

  const { data, error } = await supabase
    .from('submissions')
    .update({
      status: 'completed',
      submitted_at: new Date().toISOString(),
      score,
      max_auto_score: maxAutoScore
    })
    .eq('id', submissionId)
    .select()
    .single()
  assertNoError(error, 'Failed to complete submission')
  return data
}

export async function getResultsForLesson(lessonId) {
  const { data: submissions, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('lesson_id', lessonId)
    .order('submitted_at', { ascending: false })
  assertNoError(error, 'Failed to load submissions')

  const ids = (submissions || []).map((s) => s.id)
  let responses = []
  if (ids.length) {
    const { data, error: respError } = await supabase
      .from('responses')
      .select('*, activities(prompt, type)')
      .in('submission_id', ids)
    assertNoError(respError, 'Failed to load responses')
    responses = data || []
  }

  return (submissions || []).map((s) => ({
    ...s,
    responses: responses.filter((r) => r.submission_id === s.id)
  }))
}

// ---------- Save & Exit ----------
export async function saveLessonProgress(lessonId, currentSectionIndex, currentActivityIndex, draftAnswers) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('lesson_progress')
    .upsert({
      user_id: user.id,
      lesson_id: lessonId,
      current_section_index: currentSectionIndex,
      current_activity_index: currentActivityIndex || 0,
      draft_answers: draftAnswers,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id, lesson_id'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getLessonProgress(lessonId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('lesson_progress')
    .select('*')
    .eq('user_id', user.id)
    .eq('lesson_id', lessonId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

// ---------- folders ----------
export async function listFolders() {
  const { data, error } = await supabase
    .from('folders')
    .select('*')
    .order('position', { ascending: true })
  assertNoError(error, 'Failed to load folders')
  return data || []
}

export async function createFolder(name) {
  const { data, error } = await supabase
    .from('folders')
    .insert({ name: name.trim() })
    .select()
    .single()
  assertNoError(error, 'Failed to create folder')
  return data
}

export async function updateLessonFolder(lessonId, folderId) {
  const { data, error } = await supabase
    .from('lessons')
    .update({ folder_id: folderId || null, updated_at: new Date().toISOString() })
    .eq('id', lessonId)
    .select()
    .single()
  assertNoError(error, 'Failed to update lesson folder')
  return data
}

export async function deleteFolder(folderId) {
  const { error } = await supabase
    .from('folders')
    .delete()
    .eq('id', folderId)
  assertNoError(error, 'Failed to delete folder')
  return true
}

export async function reorderFolders(folderIds) {
  const updates = folderIds.map((id, index) => ({
    id,
    position: index
  }))
  for (const update of updates) {
    const { error } = await supabase
      .from('folders')
      .update({ position: update.position })
      .eq('id', update.id)
    assertNoError(error, 'Failed to reorder folders')
  }
  return true
}

export async function renameFolder(folderId, newName) {
  const { data, error } = await supabase
    .from('folders')
    .update({ name: newName.trim() })
    .eq('id', folderId)
    .select()
    .single()
  assertNoError(error, 'Failed to rename folder')
  return data
}

export async function bulkMoveLessons(lessonIds, folderId) {
  const { error } = await supabase
    .from('lessons')
    .update({ folder_id: folderId || null, updated_at: new Date().toISOString() })
    .in('id', lessonIds)
  assertNoError(error, 'Failed to move lessons')
  return true
}

export async function renameLesson(lessonId, newTitle) {
  const { data, error } = await supabase
    .from('lessons')
    .update({ title: newTitle.trim(), updated_at: new Date().toISOString() })
    .eq('id', lessonId)
    .select()
    .single()
  assertNoError(error, 'Failed to rename lesson')
  return data
}

export async function deleteLesson(lessonId) {
  const { error } = await supabase
    .from('lessons')
    .delete()
    .eq('id', lessonId)
  assertNoError(error, 'Failed to delete lesson')
  return true
}

export async function deleteSubmissions(submissionIds) {
  if (!submissionIds || submissionIds.length === 0) return true
  const { error } = await supabase
    .from('submissions')
    .delete()
    .in('id', submissionIds)
  assertNoError(error, 'Failed to delete submissions')
  return true
}