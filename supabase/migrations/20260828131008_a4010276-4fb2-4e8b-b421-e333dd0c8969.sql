CREATE TABLE public.dashboard_sections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  sort integer NOT NULL DEFAULT 0,
  tab_visible boolean NOT NULL DEFAULT true,
  block_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.dashboard_sections TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dashboard_sections TO authenticated;
GRANT ALL ON public.dashboard_sections TO service_role;

ALTER TABLE public.dashboard_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone signed in can read dashboard layout"
  ON public.dashboard_sections FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage dashboard layout"
  ON public.dashboard_sections FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.dashboard_sections (key, label, sort) VALUES
  ('plan', '格局圖與圖資', 0),
  ('basic', '基本資料', 1),
  ('signatures', '簽名狀態', 2),
  ('files', '相關檔案', 3),
  ('site-notes', '案場備註', 4),
  ('builder-notes', '建案備註', 5),
  ('windows', '門窗管理', 6),
  ('panels', '電箱管理', 7),
  ('videos', '影片連結', 8),
  ('staff', '出勤人員', 9),
  ('offline', '離線緩存', 10);