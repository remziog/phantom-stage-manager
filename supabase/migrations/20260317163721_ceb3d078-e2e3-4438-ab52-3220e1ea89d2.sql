-- Ekipman tablosuna case bilgileri, QR kod ve durum dağılımı alanları ekle

-- Case bilgileri
ALTER TABLE public.equipment
  ADD COLUMN IF NOT EXISTS items_per_case integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS case_weight_kg numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS case_volume_m3 numeric DEFAULT NULL;

-- QR kod alanı (benzersiz, otomatik üretilecek)
ALTER TABLE public.equipment
  ADD COLUMN IF NOT EXISTS qr_code text UNIQUE;

-- Durum dağılımı: depoda, kirada, tamirde, servis dışı adetleri
ALTER TABLE public.equipment
  ADD COLUMN IF NOT EXISTS qty_in_warehouse integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS qty_on_rent integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS qty_in_repair integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS qty_out_of_service integer NOT NULL DEFAULT 0;

-- Mevcut ekipmanlara QR kod ata
UPDATE public.equipment
SET qr_code = 'PH-' || UPPER(SUBSTRING(id::text FROM 1 FOR 8))
WHERE qr_code IS NULL;

-- Mevcut ekipmanlarda qty_in_warehouse = quantity_available olarak başlat
UPDATE public.equipment
SET qty_in_warehouse = quantity_available
WHERE qty_in_warehouse = 0;

COMMENT ON COLUMN public.equipment.items_per_case IS 'Bir case''e kaç adet sığar';
COMMENT ON COLUMN public.equipment.case_weight_kg IS 'Case dahil toplam ağırlık (kg)';
COMMENT ON COLUMN public.equipment.case_volume_m3 IS 'Case hacmi (m³)';
COMMENT ON COLUMN public.equipment.qr_code IS 'Benzersiz QR/barkod tanımlayıcısı';
COMMENT ON COLUMN public.equipment.qty_in_warehouse IS 'Depodaki adet';
COMMENT ON COLUMN public.equipment.qty_on_rent IS 'Kiradaki adet';
COMMENT ON COLUMN public.equipment.qty_in_repair IS 'Tamirdeki adet';
COMMENT ON COLUMN public.equipment.qty_out_of_service IS 'Servis dışı adet';

-- Yeni ekipmanlara otomatik QR kod atayan trigger
CREATE OR REPLACE FUNCTION public.auto_generate_qr_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.qr_code IS NULL OR NEW.qr_code = '' THEN
    NEW.qr_code := 'PH-' || UPPER(SUBSTRING(NEW.id::text FROM 1 FOR 8));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_equipment_qr_code
  BEFORE INSERT ON public.equipment
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_qr_code();