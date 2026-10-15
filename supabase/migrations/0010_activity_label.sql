-- Any activity can be logged: the type stays one of the known eight (other for anything new),
-- and the person's own name for it ("swimming", "skipping rope") is kept as a label.
alter table activity_entries add column if not exists label text check (char_length(label) <= 40);
