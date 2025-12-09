alter table direction_finder_results
add column if not exists chat_history jsonb,
add column if not exists chat_context text;
