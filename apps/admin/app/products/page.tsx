import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSupabaseAdmin } from "@veyrith/core";
import type { Database } from "@veyrith/core/database.types";
import { readSessionToken } from "@veyrith/core/session";
import { ProductManager } from "./product-manager";

export const dynamic = "force-dynamic";
type ProductImageRow = Database["public"]["Tables"]["ProductImage"]["Row"];
type ProductInstallerRow = Database["public"]["Tables"]["ProductInstaller"]["Row"];

export default async function ProductsAdminPage() {
  const token = (await cookies()).get("veyrith_admin")?.value;
  const session = token ? await readSessionToken(token, "administrator") : null;
  if (!session) redirect("/login");
  const supabase = getSupabaseAdmin();
  const { data: administrator, error: adminError } = await supabase.from("Administrator").select("id").eq("id", session.sub).eq("isActive", true).maybeSingle();
  if (adminError) throw new Error(`Could not verify administrator session: ${adminError.message}`);
  if (!administrator) redirect("/login");
  const { data: products, error } = await supabase.from("Product").select("*").order("createdAt", { ascending: false });
  if (error) throw new Error(`Could not load CMS products: ${error.message}`);
  const productIds = products.map((product) => product.id);
  const categoryIds = [...new Set(products.map((product) => product.categoryId))];
  const [{ data: categories, error: categoriesError }, { data: images, error: imagesError }, { data: versions, error: versionsError }] = await Promise.all([
    categoryIds.length ? supabase.from("ProductCategory").select("id,name").in("id", categoryIds) : Promise.resolve({ data: [], error: null }),
    productIds.length ? supabase.from("ProductImage").select("*").in("productId", productIds) : Promise.resolve({ data: [], error: null }),
    productIds.length ? supabase.from("ProductVersion").select("*").in("productId", productIds).order("createdAt", { ascending: false }) : Promise.resolve({ data: [], error: null }),
  ]);
  if (categoriesError || imagesError || versionsError) throw new Error(`Could not load product details: ${categoriesError?.message ?? imagesError?.message ?? versionsError?.message}`);
  const versionIds = (versions ?? []).map((version) => version.id);
  const { data: installers, error: installersError } = versionIds.length
    ? await supabase.from("ProductInstaller").select("*").in("versionId", versionIds)
    : { data: [], error: null };
  if (installersError) throw new Error(`Could not load installers: ${installersError.message}`);
  const categoriesById = new Map((categories ?? []).map((category) => [category.id, category.name]));
  const imagesByProduct = new Map<string, ProductImageRow[]>();
  for (const image of images ?? []) {
    const list = imagesByProduct.get(image.productId) ?? [];
    list.push(image);
    imagesByProduct.set(image.productId, list);
  }
  const installersByVersion = new Map<string, ProductInstallerRow[]>();
  for (const installer of installers ?? []) {
    const list = installersByVersion.get(installer.versionId) ?? [];
    list.push(installer);
    installersByVersion.set(installer.versionId, list);
  }
  const serializableProducts = products.map((product) => ({
    ...product,
    category: categoriesById.get(product.categoryId) ?? "",
    images: imagesByProduct.get(product.id) ?? [],
    versions: (versions ?? []).filter((version) => version.productId === product.id).map((version) => ({
      ...version,
      installers: (installersByVersion.get(version.id) ?? []).map((installer) => ({
        ...installer,
        fileSize: installer.fileSize.toString(),
      })),
    })),
  }));

  return (
    <>
      <header><a href="/">Veyrith Labs CMS</a><a href="/">Dashboard</a></header>
      <main>
        <h1>Products</h1>
        {products.length === 0 ? (
          <section className="panel"><p>No products have been added yet.</p><p>Create a product below to begin.</p></section>
        ) : (
          <ProductManager products={serializableProducts} />
        )}
        {products.length === 0 && <ProductManager products={[]} />}
      </main>
    </>
  );
}
