-- The private-media bucket had no explicit file_size_limit, so it fell back
-- to the project's global default (commonly 50MB), which is too small for
-- walkthrough/session videos. Raise it to 1GB per file.
UPDATE storage.buckets
SET file_size_limit = 1073741824 -- 1 GB in bytes
WHERE id = 'private-media';
