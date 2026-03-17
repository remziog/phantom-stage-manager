
-- Yeni rolleri ekle: sales (Teklif Hazırlayıcı) ve crew (Personel)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'sales';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'crew';
