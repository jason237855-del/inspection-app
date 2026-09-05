
CREATE TABLE public.template_spaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  sort integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.template_spaces TO authenticated;
GRANT ALL ON public.template_spaces TO service_role;
ALTER TABLE public.template_spaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "template spaces readable" ON public.template_spaces FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage template spaces" ON public.template_spaces FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.template_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sort integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.template_categories TO authenticated;
GRANT ALL ON public.template_categories TO service_role;
ALTER TABLE public.template_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "template categories readable" ON public.template_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage template categories" ON public.template_categories FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.template_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.template_categories(id) ON DELETE CASCADE,
  title text NOT NULL,
  sort integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.template_items TO authenticated;
GRANT ALL ON public.template_items TO service_role;
ALTER TABLE public.template_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "template items readable" ON public.template_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage template items" ON public.template_items FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.project_spaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_spaces TO authenticated;
GRANT ALL ON public.project_spaces TO service_role;
ALTER TABLE public.project_spaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "project members manage spaces" ON public.project_spaces FOR ALL TO authenticated USING (public.can_access_project(project_id)) WITH CHECK (public.can_access_project(project_id));

CREATE TABLE public.project_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_categories TO authenticated;
GRANT ALL ON public.project_categories TO service_role;
ALTER TABLE public.project_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "project members manage categories" ON public.project_categories FOR ALL TO authenticated USING (public.can_access_project(project_id)) WITH CHECK (public.can_access_project(project_id));

CREATE TABLE public.project_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.project_categories(id) ON DELETE CASCADE,
  title text NOT NULL,
  sort integer NOT NULL DEFAULT 0,
  hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_items TO authenticated;
GRANT ALL ON public.project_items TO service_role;
ALTER TABLE public.project_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "project members manage items config" ON public.project_items FOR ALL TO authenticated USING (public.can_access_project(project_id)) WITH CHECK (public.can_access_project(project_id));

CREATE INDEX idx_project_spaces_project ON public.project_spaces(project_id);
CREATE INDEX idx_project_categories_project ON public.project_categories(project_id);
CREATE INDEX idx_project_items_project ON public.project_items(project_id);

INSERT INTO public.template_spaces (name, sort) VALUES
  ('客廳',0),('客廳玄關',1),('主臥室',2),('次臥室一',3),('次臥室二',4),
  ('廚房',5),('主衛浴',6),('次衛浴',7),('工作陽台',8),('地下室車位',9);

INSERT INTO public.template_categories (id, name, sort) VALUES
  ('11111111-1111-4111-8111-000000000001','門窗工程',0),
  ('11111111-1111-4111-8111-000000000002','地面/牆面工程',1),
  ('11111111-1111-4111-8111-000000000003','給排水/管道工程',2),
  ('11111111-1111-4111-8111-000000000004','機電/設備工程',3);

INSERT INTO public.template_items (category_id, title, sort) VALUES
  ('11111111-1111-4111-8111-000000000001','門片開闔順暢、無異音',0),
  ('11111111-1111-4111-8111-000000000001','門鎖／把手作動正常',1),
  ('11111111-1111-4111-8111-000000000001','窗框矽利康填縫完整',2),
  ('11111111-1111-4111-8111-000000000001','玻璃無刮傷、無氣泡',3),
  ('11111111-1111-4111-8111-000000000001','紗窗滑軌順暢、無變形',4),
  ('11111111-1111-4111-8111-000000000002','地磚平整度、無突角',0),
  ('11111111-1111-4111-8111-000000000002','地磚敲擊無空鼓',1),
  ('11111111-1111-4111-8111-000000000002','牆面油漆均勻、無流掛',2),
  ('11111111-1111-4111-8111-000000000002','陰陽角垂直平整',3),
  ('11111111-1111-4111-8111-000000000002','天花板無裂縫、無水漬',4),
  ('11111111-1111-4111-8111-000000000002','踢腳板收邊密合',5),
  ('11111111-1111-4111-8111-000000000003','給水出水量正常、無滲漏',0),
  ('11111111-1111-4111-8111-000000000003','排水順暢、無積水',1),
  ('11111111-1111-4111-8111-000000000003','地排存水彎無異味',2),
  ('11111111-1111-4111-8111-000000000003','管道間封堵完整',3),
  ('11111111-1111-4111-8111-000000000003','洩水坡度正確',4),
  ('11111111-1111-4111-8111-000000000004','插座通電、極性正確',0),
  ('11111111-1111-4111-8111-000000000004','開關對應燈具正確',1),
  ('11111111-1111-4111-8111-000000000004','弱電／網路孔測試正常',2),
  ('11111111-1111-4111-8111-000000000004','排風扇運轉正常',3),
  ('11111111-1111-4111-8111-000000000004','冷氣排水管配置正確',4);
