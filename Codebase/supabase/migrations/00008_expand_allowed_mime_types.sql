-- Update the user-files bucket to allow more file types
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  -- Documents
  'application/pdf',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  -- Text files
  'text/plain',
  'text/markdown',
  'text/csv',
  -- Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  -- Archives
  'application/zip',
  'application/x-zip-compressed',
  -- Generic fallback
  'application/octet-stream'
]
WHERE name = 'user-files';


