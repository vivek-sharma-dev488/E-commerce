import { createElement, lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { AdminRoute } from '../routes/AdminRoute'
import { ProtectedRoute } from '../routes/ProtectedRoute'

const HomePage = lazy(() => import('../features/home/HomePage').then((module) => ({ default: module.HomePage })))
const CatalogPage = lazy(() => import('../features/catalog/CatalogPage').then((module) => ({ default: module.CatalogPage })))
const ProductDetailsPage = lazy(() => import('../features/product/ProductDetailsPage').then((module) => ({ default: module.ProductDetailsPage })))
const LoginPage = lazy(() => import('../features/auth/LoginPage').then((module) => ({ default: module.LoginPage })))
const SignupPage = lazy(() => import('../features/auth/SignupPage').then((module) => ({ default: module.SignupPage })))
const ForgotPasswordPage = lazy(() => import('../features/auth/ForgotPasswordPage').then((module) => ({ default: module.ForgotPasswordPage })))
const ResetPasswordPage = lazy(() => import('../features/auth/ResetPasswordPage').then((module) => ({ default: module.ResetPasswordPage })))
const AdminLoginPage = lazy(() => import('../features/auth/AdminLoginPage').then((module) => ({ default: module.AdminLoginPage })))
const CartPage = lazy(() => import('../features/cart/CartPage').then((module) => ({ default: module.CartPage })))
const CheckoutPage = lazy(() => import('../features/checkout/CheckoutPage').then((module) => ({ default: module.CheckoutPage })))
const MyOrdersPage = lazy(() => import('../features/orders/MyOrdersPage').then((module) => ({ default: module.MyOrdersPage })))
const OrderDetailsPage = lazy(() => import('../features/orders/OrderDetailsPage').then((module) => ({ default: module.OrderDetailsPage })))
const WishlistPage = lazy(() => import('../features/wishlist/WishlistPage').then((module) => ({ default: module.WishlistPage })))
const AddressBookPage = lazy(() => import('../features/addresses/AddressBookPage').then((module) => ({ default: module.AddressBookPage })))
const NotificationsPage = lazy(() => import('../features/notifications/NotificationsPage').then((module) => ({ default: module.NotificationsPage })))
const AdminDashboardPage = lazy(() => import('../features/admin/AdminDashboardPage').then((module) => ({ default: module.AdminDashboardPage })))
const ProductManagementPage = lazy(() => import('../features/admin/ProductManagementPage').then((module) => ({ default: module.ProductManagementPage })))
const OrdersManagementPage = lazy(() => import('../features/admin/OrdersManagementPage').then((module) => ({ default: module.OrdersManagementPage })))
const UsersManagementPage = lazy(() => import('../features/admin/UsersManagementPage').then((module) => ({ default: module.UsersManagementPage })))

function PageLoader() {
  return <div className="h-56 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
}

function LayoutRoute({ Component }) {
  return (
    <AppLayout>
      <Suspense fallback={<PageLoader />}>
        {createElement(Component)}
      </Suspense>
    </AppLayout>
  )
}

function NotFoundPage() {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
      <h1 className="font-heading text-3xl font-semibold text-slate-900 dark:text-white">
        404 | Page not found
      </h1>
      <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
        The page you requested does not exist.
      </p>
    </div>
  )
}

export function AppRouter() {
  return (
    <Routes>
      <Route element={<LayoutRoute Component={HomePage} />} path="/" />

      <Route element={<LayoutRoute Component={CatalogPage} />} path="/catalog" />
      <Route element={<LayoutRoute Component={ProductDetailsPage} />} path="/product/:slug" />

      <Route element={<LayoutRoute Component={LoginPage} />} path="/login" />
      <Route element={<LayoutRoute Component={SignupPage} />} path="/signup" />
      <Route element={<LayoutRoute Component={ForgotPasswordPage} />} path="/forgot-password" />
      <Route element={<LayoutRoute Component={ResetPasswordPage} />} path="/reset-password" />
      <Route element={<LayoutRoute Component={AdminLoginPage} />} path="/admin/login" />

      <Route element={<ProtectedRoute />}>
        <Route element={<LayoutRoute Component={CartPage} />} path="/cart" />
        <Route element={<LayoutRoute Component={CheckoutPage} />} path="/checkout" />
        <Route element={<LayoutRoute Component={MyOrdersPage} />} path="/orders" />
        <Route element={<LayoutRoute Component={OrderDetailsPage} />} path="/orders/:orderId" />
        <Route element={<LayoutRoute Component={WishlistPage} />} path="/wishlist" />
        <Route element={<LayoutRoute Component={AddressBookPage} />} path="/addresses" />
        <Route element={<LayoutRoute Component={NotificationsPage} />} path="/notifications" />
      </Route>

      <Route element={<AdminRoute />}>
        <Route element={<LayoutRoute Component={AdminDashboardPage} />} path="/admin" />
        <Route element={<LayoutRoute Component={ProductManagementPage} />} path="/admin/products" />
        <Route element={<LayoutRoute Component={OrdersManagementPage} />} path="/admin/orders" />
        <Route element={<LayoutRoute Component={UsersManagementPage} />} path="/admin/users" />
      </Route>

      <Route element={<Navigate replace to="/" />} path="/home" />
      <Route element={<LayoutRoute Component={NotFoundPage} />} path="*" />
    </Routes>
  )
}
