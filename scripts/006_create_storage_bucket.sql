-- Create storage bucket for article images
INSERT INTO storage.buckets (id, name, public)
VALUES ('article-images', 'article-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to article images
CREATE POLICY "Public can view article images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'article-images');

-- Allow authenticated and anon users to upload (auth handled by API cookie check)
CREATE POLICY "Anyone can upload article images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'article-images');

-- Allow deletion
CREATE POLICY "Anyone can delete article images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'article-images');
