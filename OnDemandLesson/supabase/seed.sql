-- Example lesson used to sanity-check the prototype end to end.
-- Run after schema.sql. Safe to run once; running it twice creates a duplicate lesson.

do $$
declare
  v_lesson_id uuid;
begin

  insert into lessons (title, level, reading_text, status, share_slug)
  values (
    'Government and Values',
    'B1',
    E'The purpose of a government is to govern the nation-state. But behind that simple idea sits a harder question: whose values does the government represent?\n\n'
    'In a democracy, power belongs to the many. Citizens vote, and the government is supposed to answer to them. In theory, this means laws reflect what most people want. In practice, not every citizen has equal influence. Some groups organise, donate money, or have better access to politicians, and their values can carry more weight than their numbers alone would suggest.\n\n'
    'A different kind of system is a plutocracy, where wealth itself controls government decisions. This can happen even inside a country that calls itself a democracy, if money buys enough political influence. When that happens, laws may serve the interests of a small, rich group rather than the wider population.\n\n'
    'One safeguard against any single group controlling everything is the separation of powers: dividing government into branches, typically legislative, executive, and judicial, so that no one part can act without being checked by the others. If a law is unjust, courts can challenge it. If a leader oversteps their authority, a legislature can act against them. Separation of powers does not remove disagreement about values, but it slows down any one group from imposing its values unchecked.\n\n'
    'Still, the final paragraph of most defences of democracy rests on an assumption worth questioning: that ordinary citizens, given information and a vote, will generally choose government that serves the common good. Critics argue that voters are often poorly informed, swayed by short-term emotion, or simply outnumbered by concentrated interests. Whether or not one accepts that criticism, it points back to the opening question. Democracy does not answer whose values a government represents. It only offers a process for deciding.',
    'published',
    'gov-values-demo'
  )
  returning id into v_lesson_id;

  insert into vocabulary (lesson_id, term, definition, example, position) values
    (v_lesson_id, 'nation-state', 'a country with its own government and defined borders', 'Japan is a nation-state with a long constitutional history.', 0),
    (v_lesson_id, 'democracy', 'a system of government where power belongs to the people, usually through voting', 'In a democracy, citizens elect their representatives.', 1),
    (v_lesson_id, 'plutocracy', 'a system of government controlled by wealthy people', 'Critics said the country was becoming a plutocracy.', 2),
    (v_lesson_id, 'separation of powers', 'dividing government into branches that check each other', 'Separation of powers stops any one branch becoming too strong.', 3),
    (v_lesson_id, 'concentrated interests', 'a small group with a strong, focused stake in an outcome', 'Concentrated interests can outweigh the general public in policy debates.', 4);

  insert into activities (lesson_id, type, prompt, config, points, position) values
    (v_lesson_id, 'gap_fill', 'The critical question to apply to any government is whose ____?',
      '{"accepted_answers": ["values"]}', 1, 0),
    (v_lesson_id, 'gap_fill', 'A democracy represents the power of the ____.',
      '{"accepted_answers": ["many"]}', 1, 1),
    (v_lesson_id, 'gap_fill', 'A country controlled by wealthy people is a ____.',
      '{"accepted_answers": ["plutocracy"]}', 1, 2),
    (v_lesson_id, 'multiple_choice', 'Which statement best represents the argument of the text?',
      '{"options": ["Democracy always represents the values of every citizen equally.", "Democracy offers a process for choosing government, but does not by itself guarantee whose values win out.", "Plutocracy is a more efficient system than democracy.", "Separation of powers removes all disagreement about values."], "correct_index": 1}',
      1, 3),
    (v_lesson_id, 'short_answer', 'Why does separation of powers matter, according to the text?',
      '{}', 2, 4),
    (v_lesson_id, 'reasoning', 'What assumption about democracy is challenged in the final paragraph? State the assumption and explain, with reference to the text, why the author questions it.',
      '{"subtype": "assumption"}', 3, 5);

end $$;
