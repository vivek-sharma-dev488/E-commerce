import { Upload } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Button } from '../../components/common/Button'
import { Card } from '../../components/common/Card'
import { SectionTitle } from '../../components/common/SectionTitle'
import { COUPONS } from '../../lib/constants'
import { adminService } from '../../services/adminService'

const initialProductForm = {
  id: '',
  name: '',
  slug: '',
  brand: '',
  category: '',
  price: '',
  compareAtPrice: '',
  stock: '',
  sizes: '',
  colors: '',
}

export function ProductManagementPage() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [categoryForm, setCategoryForm] = useState('')
  const [productForm, setProductForm] = useState(initialProductForm)
  const [csvPreview, setCsvPreview] = useState([])
  const [customCoupons, setCustomCoupons] = useState(COUPONS)
  const [couponForm, setCouponForm] = useState({ code: '', value: '', minAmount: '' })

  useEffect(() => {
    let cancelled = false

    const loadAdminData = async () => {
      const [productData, categoryData] = await Promise.all([
        adminService.fetchProducts(),
        adminService.fetchCategories(),
      ])

      if (!cancelled) {
        setProducts(productData)
        setCategories(categoryData)
      }
    }

    loadAdminData()

    return () => {
      cancelled = true
    }
  }, [])

  const lowStockProducts = useMemo(
    () => products.filter((product) => Number(product.stock) <= 10),
    [products],
  )

  const handleProductSave = (event) => {
    event.preventDefault()

    if (!productForm.name || !productForm.slug) {
      toast.error('Product name and slug are required')
      return
    }

    const payload = {
      ...productForm,
      id: productForm.id || `local-prod-${Date.now()}`,
      price: Number(productForm.price),
      compareAtPrice: Number(productForm.compareAtPrice),
      stock: Number(productForm.stock),
      sizes: productForm.sizes.split(',').map((item) => item.trim()),
      colors: productForm.colors.split(',').map((item) => item.trim()),
    }

    setProducts((state) => {
      const exists = state.some((product) => product.id === payload.id)
      if (exists) {
        return state.map((product) => (product.id === payload.id ? { ...product, ...payload } : product))
      }
      return [payload, ...state]
    })

    setProductForm(initialProductForm)
    toast.success('Product saved')
  }

  const editProduct = (product) => {
    setProductForm({
      id: product.id,
      name: product.name,
      slug: product.slug,
      brand: product.brand,
      category: product.category,
      price: product.price,
      compareAtPrice: product.compareAtPrice,
      stock: product.stock,
      sizes: (product.sizes || []).join(', '),
      colors: (product.colors || []).join(', '),
    })
  }

  const deleteProduct = (productId) => {
    setProducts((state) => state.filter((product) => product.id !== productId))
    toast.success('Product deleted')
  }

  const handleImageUpload = async (event) => {
    const files = Array.from(event.target.files || [])

    if (!files.length) {
      return
    }

    try {
      const uploaded = await adminService.uploadProductImages(files)
      toast.success(`${uploaded.length} image(s) uploaded`)
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleCsvUpload = async (event) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    const text = await file.text()

    try {
      const rows = adminService.parseCsv(text)
      setCsvPreview(rows.slice(0, 8))
      toast.success(`CSV loaded with ${rows.length} rows`)
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleCouponSave = (event) => {
    event.preventDefault()

    if (!couponForm.code) {
      toast.error('Coupon code is required')
      return
    }

    setCustomCoupons((state) => [
      ...state,
      {
        code: couponForm.code.trim().toUpperCase(),
        discountType: 'percentage',
        value: Number(couponForm.value),
        minAmount: Number(couponForm.minAmount),
      },
    ])

    setCouponForm({ code: '', value: '', minAmount: '' })
    toast.success('Coupon created')
  }

  const handleCategoryAdd = (event) => {
    event.preventDefault()

    const normalized = categoryForm.trim()

    if (!normalized) {
      toast.error('Category name is required')
      return
    }

    const slug = normalized.toLowerCase().replaceAll(' ', '-')

    setCategories((state) => [
      ...state,
      {
        id: `local-cat-${Date.now()}`,
        name: normalized,
        slug,
      },
    ])

    setCategoryForm('')
    toast.success('Category added')
  }

  const handleCategoryDelete = (categoryId) => {
    setCategories((state) => state.filter((category) => category.id !== categoryId))
    toast.success('Category removed')
  }

  return (
    <div className="space-y-6">
      <SectionTitle
        subtitle="Products, categories, variants, images, inventory and coupons"
        title="Admin Product Console"
      />

      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <Card className="space-y-4 p-5">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Add / Edit Product
          </h3>

          <form className="space-y-3" onSubmit={handleProductSave}>
            <input
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              onChange={(event) => setProductForm((state) => ({ ...state, name: event.target.value }))}
              placeholder="Product name"
              value={productForm.name}
            />
            <input
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              onChange={(event) => setProductForm((state) => ({ ...state, slug: event.target.value }))}
              placeholder="Slug"
              value={productForm.slug}
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                onChange={(event) => setProductForm((state) => ({ ...state, brand: event.target.value }))}
                placeholder="Brand"
                value={productForm.brand}
              />
              <select
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                onChange={(event) => setProductForm((state) => ({ ...state, category: event.target.value }))}
                value={productForm.category}
              >
                <option value="">Select category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.slug || category.name.toLowerCase()}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <input
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                onChange={(event) => setProductForm((state) => ({ ...state, price: event.target.value }))}
                placeholder="Price"
                value={productForm.price}
              />
              <input
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                onChange={(event) =>
                  setProductForm((state) => ({ ...state, compareAtPrice: event.target.value }))
                }
                placeholder="Compare"
                value={productForm.compareAtPrice}
              />
              <input
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                onChange={(event) => setProductForm((state) => ({ ...state, stock: event.target.value }))}
                placeholder="Stock"
                value={productForm.stock}
              />
            </div>

            <input
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              onChange={(event) => setProductForm((state) => ({ ...state, sizes: event.target.value }))}
              placeholder="Variants - sizes (comma separated)"
              value={productForm.sizes}
            />
            <input
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              onChange={(event) => setProductForm((state) => ({ ...state, colors: event.target.value }))}
              placeholder="Variants - colors (comma separated)"
              value={productForm.colors}
            />

            <Button className="w-full" type="submit">
              Save Product
            </Button>
          </form>

          <div className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-700">
            <h4 className="font-semibold text-slate-900 dark:text-slate-100">Upload Product Images</h4>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold dark:border-slate-700">
              <Upload className="h-4 w-4" />
              Upload files
              <input className="hidden" multiple onChange={handleImageUpload} type="file" />
            </label>
          </div>

          <div className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-700">
            <h4 className="font-semibold text-slate-900 dark:text-slate-100">Bulk CSV Upload</h4>
            <input
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              onChange={handleCsvUpload}
              type="file"
            />
            {csvPreview.length ? (
              <div className="max-h-48 overflow-auto rounded-xl border border-slate-200 p-2 text-xs dark:border-slate-700">
                {csvPreview.map((row, index) => (
                  <p key={index}>{JSON.stringify(row)}</p>
                ))}
              </div>
            ) : null}
          </div>

          <div className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-700">
            <h4 className="font-semibold text-slate-900 dark:text-slate-100">Coupon Management</h4>
            <form className="grid grid-cols-3 gap-2" onSubmit={handleCouponSave}>
              <input
                className="rounded-xl border border-slate-300 bg-white px-2 py-2 text-xs dark:border-slate-700 dark:bg-slate-900"
                onChange={(event) => setCouponForm((state) => ({ ...state, code: event.target.value }))}
                placeholder="Code"
                value={couponForm.code}
              />
              <input
                className="rounded-xl border border-slate-300 bg-white px-2 py-2 text-xs dark:border-slate-700 dark:bg-slate-900"
                onChange={(event) => setCouponForm((state) => ({ ...state, value: event.target.value }))}
                placeholder="% off"
                value={couponForm.value}
              />
              <input
                className="rounded-xl border border-slate-300 bg-white px-2 py-2 text-xs dark:border-slate-700 dark:bg-slate-900"
                onChange={(event) =>
                  setCouponForm((state) => ({ ...state, minAmount: event.target.value }))
                }
                placeholder="Min"
                value={couponForm.minAmount}
              />
              <Button className="col-span-3" type="submit" variant="outline">
                Add Coupon
              </Button>
            </form>
            <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
              {customCoupons.map((coupon) => (
                <p key={coupon.code}>
                  {coupon.code}: {coupon.value}% off (min Rs. {coupon.minAmount})
                </p>
              ))}
            </div>
          </div>

          <div className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-700">
            <h4 className="font-semibold text-slate-900 dark:text-slate-100">Category Management</h4>
            <form className="flex gap-2" onSubmit={handleCategoryAdd}>
              <input
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                onChange={(event) => setCategoryForm(event.target.value)}
                placeholder="New category"
                value={categoryForm}
              />
              <Button type="submit" variant="outline">
                Add
              </Button>
            </form>
            <div className="space-y-2 text-sm">
              {categories.map((category) => (
                <div className="flex items-center justify-between" key={category.id}>
                  <p className="text-slate-700 dark:text-slate-200">{category.name}</p>
                  <Button onClick={() => handleCategoryDelete(category.id)} variant="ghost">
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-100">Inventory Management</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Low stock alerts highlight SKUs nearing stock-out.
            </p>
            <div className="mt-4 space-y-2">
              {lowStockProducts.map((product) => (
                <div
                  className="flex items-center justify-between rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm dark:border-rose-900/50 dark:bg-rose-900/20"
                  key={product.id}
                >
                  <p>{product.name}</p>
                  <p className="font-semibold text-rose-700">{product.stock} left</p>
                </div>
              ))}
              {!lowStockProducts.length ? (
                <p className="text-sm text-slate-500">No low stock alerts currently.</p>
              ) : null}
            </div>
          </Card>

          <Card className="space-y-3 p-5">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">All Products</h3>
            {products.map((product) => (
              <div
                className="grid items-center gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700 md:grid-cols-[1fr_auto]"
                key={product.id}
              >
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">{product.name}</p>
                  <p className="text-xs text-slate-500">{product.slug}</p>
                  <p className="text-xs text-slate-500">Stock: {product.stock}</p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => editProduct(product)} variant="outline">
                    Edit
                  </Button>
                  <Button onClick={() => deleteProduct(product.id)} variant="danger">
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  )
}
