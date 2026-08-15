-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "searchVector" tsvector;

-- Заполняем существующие строки (russian + english конфигурация для FTS)
UPDATE "Product"
SET "searchVector" = setweight(to_tsvector('russian', coalesce(name, '')), 'A') ||
                     setweight(to_tsvector('russian', coalesce(description, '')), 'B');

-- GIN-индекс для полнотекстового поиска
CREATE INDEX "Product_searchVector_idx" ON "Product" USING GIN ("searchVector");

-- Триггер: держим searchVector актуальным при INSERT/UPDATE
CREATE OR REPLACE FUNCTION product_search_vector_trigger()
RETURNS trigger AS $$
BEGIN
  NEW."searchVector" := setweight(to_tsvector('russian', coalesce(NEW.name, '')), 'A') ||
                        setweight(to_tsvector('russian', coalesce(NEW.description, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_product_search_vector
BEFORE INSERT OR UPDATE OF name, description ON "Product"
FOR EACH ROW
EXECUTE FUNCTION product_search_vector_trigger();