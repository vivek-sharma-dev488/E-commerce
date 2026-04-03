import { Upload } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Button } from '../../components/common/Button'
import { Card } from '../../components/common/Card'
import { SectionTitle } from '../../components/common/SectionTitle'
import { USER_ROLES } from '../../lib/constants'
import { formatCurrency } from '../../lib/utils'
import { adminService } from '../../services/adminService'
import { useAuthStore } from '../../store/authStore'

const initialProductForm = {
  id: '',
  name: '',
  slug: '',
  brand: '',
  categoryId: '',
  shortDescription: '',
  price: '',
  compareAtPrice: '',
  stock: '',
  sizes: '',
  colors: '',
  imageUrls: '',
  isActive: true,
}

const initialCouponForm = {
  code: '',
  discountType: 'percentage',
  value: '',
  minAmount: '',
}

const parseCommaValues = (value) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

const parseImageUrls = (value) =>
  value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean)

export function ProductManagementPage() {
  const role = useAuthStore((state) => state.role)
  const user = useAuthStore((state) => state.user)
  const isAdmin = role === USER_ROLES.ADMIN

  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [coupons, setCoupons] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  const [categoryForm, setCategoryForm] = useState('')
  const [isCategorySubmitting, setIsCategorySubmitting] = useState(false)

  const [productForm, setProductForm] = useState(initialProductForm)
  const [productImageFiles, setProductImageFiles] = useState([])
  const [isProductSubmitting, setIsProductSubmitting] = useState(false)

  const [couponForm, setCouponForm] = useState(initialCouponForm)
  const [isCouponSubmitting, setIsCouponSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false

    const loadAdminData = async () => {
      setIsLoading(true)

      try {
        const [productData, categoryData, couponData] = await Promise.all([
          adminService.fetchProducts(),
          adminService.fetchCategories(),
          isAdmin ? adminService.fetchCoupons() : Promise.resolve([]),
        ])

        if (!cancelled) {
          setProducts(productData)
          setCategories(categoryData)
          setCoupons(couponData)
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(error.message)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadAdminData()

    return () => {
      cancelled = true
    }
  }, [isAdmin])

  const lowStockProducts = useMemo(
    () => products.filter((product) => Number(product.stock) <= 10 && product.isActive !== false),
    [products],
  )

  const handleProductSave = async (event) => {
    event.preventDefault()

    if (!productForm.name.trim() || !productForm.slug.trim()) {
      toast.error('Product name and slug are required.')
      return
    }

    if (!productForm.categoryId) {
      toast.error('Select a category before saving.')
      return
    }

    if (Number(productForm.price || 0) <= 0) {
      toast.error('Price must be greater than 0.')
      return
    }

    const manualImageUrls = parseImageUrls(productForm.imageUrls)

    if (!manualImageUrls.length && !productImageFiles.length) {
      toast.error('Add at least one product image URL or upload image files.')
      return
    }

    setIsProductSubmitting(true)

    try {
      let uploadedUrls = []

      if (productImageFiles.length) {
        const uploads = await adminService.uploadProductImages(productImageFiles)
        uploadedUrls = uploads.map((item) => item.url)
      }

      const payload = {
        id: productForm.id || undefined,
        name: productForm.name.trim(),
        slug: productForm.slug.trim(),
        brand: productForm.brand.trim(),
        categoryId: productForm.categoryId,
        shortDescription: productForm.shortDescription.trim(),
        price: Number(productForm.price || 0),
        compareAtPrice:
          productForm.compareAtPrice === '' ? null : Number(productForm.compareAtPrice || 0),
        stock: Number(productForm.stock || 0),
        sizes: parseCommaValues(productForm.sizes),
        colors: parseCommaValues(productForm.colors),
        images: [...new Set([...manualImageUrls, ...uploadedUrls])],
        isActive: productForm.isActive,
      }

      const saved = await adminService.upsertProduct(payload)

      setProducts((state) => {
        const exists = state.some((product) => product.id === saved.id)
        if (exists) {
          return state.map((product) => (product.id === saved.id ? saved : product))
        }
        return [saved, ...state]
      })

      setProductForm(initialProductForm)
      setProductImageFiles([])
      toast.success(productForm.id ? 'Product updated successfully.' : 'Product created successfully.')
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsProductSubmitting(false)
    }
  }

  const editProduct = (product) => {
    setProductForm({
      id: product.id,
      name: product.name,
      slug: product.slug,
      brand: product.brand,
      categoryId: product.categoryId,
      shortDescription: product.shortDescription || '',
      price: product.price,
      compareAtPrice: product.compareAtPrice || '',
      stock: product.stock,
      sizes: (product.sizes || []).join(', '),
      colors: (product.colors || []).join(', '),
      imageUrls: (product.images || []).join('\n'),
      isActive: product.isActive !== false,
    })
    setProductImageFiles([])
  }

  const deleteProduct = async (productId) => {
    const shouldDelete = window.confirm('Delete this product? This action cannot be undone.')

    if (!shouldDelete) {
      return
    }

    try {
      await adminService.deleteProduct(productId)
      setProducts((state) => state.filter((product) => product.id !== productId))
      toast.success('Product deleted.')
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleCategoryAdd = async (event) => {
    event.preventDefault()

    if (!isAdmin) {
      return
    }

    const normalized = categoryForm.trim()

    if (!normalized) {
      toast.error('Category name is required.')
      return
    }

    const slug = normalized.toLowerCase().replace(/\s+/g, '-')

    setIsCategorySubmitting(true)

    try {
      const created = await adminService.createCategory({
        name: normalized,
        slug,
      })

      setCategories((state) =>
        [...state, created].sort((a, b) => a.name.localeCompare(b.name)),
      )

      setCategoryForm('')
      toast.success('Category added.')
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsCategorySubmitting(false)
    }
  }

  const handleCategoryDelete = async (categoryId) => {
    const shouldDelete = window.confirm('Delete this category? Products using it must be moved first.')

    if (!shouldDelete) {
      return
    }

    try {
      await adminService.deleteCategory(categoryId)
      setCategories((state) => state.filter((category) => category.id !== categoryId))
      toast.success('Category removed.')
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleCouponSave = async (event) => {
    event.preventDefault()

    if (!isAdmin) {
      return
    }

    if (!couponForm.code.trim()) {
      toast.error('Coupon code is required.')
      return
    }

    if (Number(couponForm.value || 0) <= 0) {
      toast.error('Discount value must be greater than 0.')
      return
    }

    setIsCouponSubmitting(true)

    try {
      const created = await adminService.createCoupon(
        {
          code: couponForm.code,
          discountType: couponForm.discountType,
          value: couponForm.value,
          minAmount: couponForm.minAmount,
        },
        user?.id,
      )

      setCoupons((state) => [created, ...state])
      setCouponForm(initialCouponForm)
      toast.success('Coupon created.')
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsCouponSubmitting(false)
    }
  }

  const toggleCouponStatus = async (coupon) => {
    try {
      const updated = await adminService.setCouponActive(coupon.id, !coupon.isActive)

      setCoupons((state) =>
        state.map((item) => (item.id === updated.id ? updated : item)),
      )

      toast.success(updated.isActive ? 'Coupon activated.' : 'Coupon deactivated.')
    } catch (error) {
      toast.error(error.message)
    }
  }

  if (isLoading) {
    return <div className="h-72 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
  }

  const title = isAdmin ? 'Catalog & Inventory Management' : 'Retailer Product Console'
  const subtitle = isAdmin
    ? 'Manage products, categories, inventory, and promotional coupons.'
    : 'Manage product listings, stock, and catalog quality for storefront operations.'

  const submitLabel = productForm.id
    ? isProductSubmitting
      ? 'Updating...'
      : 'Update Product'
    : isProductSubmitting
      ? 'Creating...'
      : 'Create Product'

  const hasCategories = categories.length > 0

  const sortedProducts = [...products].sort((a, b) =>
    new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
  )

  return (
    <div className="space-y-6">
      <SectionTitle subtitle={subtitle} title={title} />

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <Card className="space-y-4 p-5">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Add / Edit Product</h3>

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
              placeholder="Slug (example: running-shoe-pro)"
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
                disabled={!hasCategories}
                onChange={(event) =>
                  setProductForm((state) => ({ ...state, categoryId: event.target.value }))
                }
                value={productForm.categoryId}
              >
                <option value="">{hasCategories ? 'Select category' : 'No categories available'}</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <textarea
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              onChange={(event) =>
                setProductForm((state) => ({ ...state, shortDescription: event.target.value }))
              }
              placeholder="Short product description"
              rows={2}
              value={productForm.shortDescription}
            />

            <div className="grid grid-cols-3 gap-2">
              <input
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                min="0"
                onChange={(event) => setProductForm((state) => ({ ...state, price: event.target.value }))}
                placeholder="Price"
                type="number"
                value={productForm.price}
              />

              <input
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                min="0"
                onChange={(event) =>
                  setProductForm((state) => ({ ...state, compareAtPrice: event.target.value }))
                }
                placeholder="Compare"
                type="number"
                value={productForm.compareAtPrice}
              />

              <input
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                min="0"
                onChange={(event) => setProductForm((state) => ({ ...state, stock: event.target.value }))}
                placeholder="Stock"
                type="number"
                value={productForm.stock}
              />
            </div>

            <input
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              onChange={(event) => setProductForm((state) => ({ ...state, sizes: event.target.value }))}
              placeholder="Sizes (comma separated)"
              value={productForm.sizes}
            />

            <input
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              onChange={(event) => setProductForm((state) => ({ ...state, colors: event.target.value }))}
              placeholder="Colors (comma separated)"
              value={productForm.colors}
            />

            <textarea
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              onChange={(event) => setProductForm((state) => ({ ...state, imageUrls: event.target.value }))}
              placeholder="Image URLs (one per line or comma separated)"
              rows={3}
              value={productForm.imageUrls}
            />

            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold dark:border-slate-700">
              <Upload className="h-4 w-4" />
              Upload product images
              <input
                className="hidden"
                multiple
                onChange={(event) => {
                  setProductImageFiles(Array.from(event.target.files || []))
                }}
                type="file"
              />
            </label>

            {productImageFiles.length ? (
              <p className="text-xs text-slate-500">{productImageFiles.length} image file(s) selected.</p>
            ) : null}

            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
              <input
                checked={productForm.isActive}
                onChange={(event) =>
                  setProductForm((state) => ({ ...state, isActive: event.target.checked }))
                }
                type="checkbox"
              />
              Product is active
            </label>

            <div className="grid grid-cols-2 gap-2">
              <Button className="w-full" disabled={isProductSubmitting || !hasCategories} type="submit">
                {submitLabel}
              </Button>

              <Button
                className="w-full"
                onClick={() => {
                  setProductForm(initialProductForm)
                  setProductImageFiles([])
                }}
                type="button"
                variant="outline"
              >
                Reset
              </Button>
            </div>
          </form>

          {isAdmin ? (
            <>
              <div className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-700">
                <h4 className="font-semibold text-slate-900 dark:text-slate-100">Coupon Management</h4>

                <form className="grid grid-cols-2 gap-2" onSubmit={handleCouponSave}>
                  <input
                    className="rounded-xl border border-slate-300 bg-white px-2 py-2 text-xs dark:border-slate-700 dark:bg-slate-900"
                    onChange={(event) => setCouponForm((state) => ({ ...state, code: event.target.value }))}
                    placeholder="Code"
                    value={couponForm.code}
                  />

                  <select
                    className="rounded-xl border border-slate-300 bg-white px-2 py-2 text-xs dark:border-slate-700 dark:bg-slate-900"
                    onChange={(event) =>
                      setCouponForm((state) => ({ ...state, discountType: event.target.value }))
                    }
                    value={couponForm.discountType}
                  >
                    <option value="percentage">Percentage</option>
                    <option value="flat">Flat</option>
                    <option value="shipping">Shipping</option>
                  </select>

                  <input
                    className="rounded-xl border border-slate-300 bg-white px-2 py-2 text-xs dark:border-slate-700 dark:bg-slate-900"
                    min="0"
                    onChange={(event) => setCouponForm((state) => ({ ...state, value: event.target.value }))}
                    placeholder="Discount"
                    type="number"
                    value={couponForm.value}
                  />

                  <input
                    className="rounded-xl border border-slate-300 bg-white px-2 py-2 text-xs dark:border-slate-700 dark:bg-slate-900"
                    min="0"
                    onChange={(event) =>
                      setCouponForm((state) => ({ ...state, minAmount: event.target.value }))
                    }
                    placeholder="Min order"
                    type="number"
                    value={couponForm.minAmount}
                  />

                  <Button className="col-span-2" disabled={isCouponSubmitting} type="submit" variant="outline">
                    {isCouponSubmitting ? 'Saving...' : 'Add Coupon'}
                  </Button>
                </form>

                <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                  {coupons.map((coupon) => (
                    <div className="flex items-center justify-between gap-2" key={coupon.id}>
                      <p>
                        {coupon.code} ({coupon.discountType}) - {coupon.value} / Min {formatCurrency(coupon.minAmount)}
                      </p>
                      <Button onClick={() => toggleCouponStatus(coupon)} variant="ghost">
                        {coupon.isActive ? 'Disable' : 'Enable'}
                      </Button>
                    </div>
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

                  <Button disabled={isCategorySubmitting} type="submit" variant="outline">
                    {isCategorySubmitting ? 'Adding...' : 'Add'}
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
            </>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300">
              Categories and coupons are managed by admins. Retailers can manage product listings and inventory only.
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-100">Inventory Alerts</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Low stock SKUs are highlighted to help prevent stock-outs.
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
              {!lowStockProducts.length ? <p className="text-sm text-slate-500">No low stock alerts currently.</p> : null}
            </div>
          </Card>

          <Card className="space-y-3 p-5">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">All Products</h3>

            {!sortedProducts.length ? <p className="text-sm text-slate-500">No products available.</p> : null}

            {sortedProducts.map((product) => (
              <div
                className="grid items-center gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700 md:grid-cols-[1fr_auto]"
                key={product.id}
              >
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">{product.name}</p>
                  <p className="text-xs text-slate-500">/{product.slug}</p>
                  <p className="text-xs text-slate-500">Category: {product.categoryName || 'Uncategorized'}</p>
                  <p className="text-xs text-slate-500">
                    Price: {formatCurrency(product.price)} | Stock: {product.stock}
                  </p>
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
