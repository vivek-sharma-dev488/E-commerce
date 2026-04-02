import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/common/Button'
import { Card } from '../../components/common/Card'
import { EmptyState } from '../../components/common/EmptyState'
import { SectionTitle } from '../../components/common/SectionTitle'
import { addressService } from '../../services/addressService'
import { useAuthStore } from '../../store/authStore'

const initialForm = {
  id: '',
  name: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  pincode: '',
  phone: '',
  label: 'home',
  isDefault: false,
}

export function AddressBookPage() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const signOutAllDevices = useAuthStore((state) => state.signOutAllDevices)
  const [addresses, setAddresses] = useState([])
  const [form, setForm] = useState(initialForm)
  const [availability, setAvailability] = useState(null)

  useEffect(() => {
    let cancelled = false

    const loadAddresses = async () => {
      const data = await addressService.fetchAddresses(user?.id)

      if (!cancelled) {
        setAddresses(data)
      }
    }

    loadAddresses()

    return () => {
      cancelled = true
    }
  }, [user?.id])

  const clearForm = () => {
    setForm(initialForm)
    setAvailability(null)
  }

  const validateDelivery = () => {
    if (!addressService.validatePincode(form.pincode)) {
      toast.error('Pincode should be exactly 6 digits')
      return
    }

    const result = addressService.checkDeliveryAvailability(form.pincode)
    setAvailability(result)

    if (result.available) {
      toast.success(`Delivery available. ETA: ${result.etaDays} days`)
    } else {
      toast.error('Delivery is not available for this pincode yet')
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!addressService.validatePincode(form.pincode)) {
      toast.error('Pincode should be exactly 6 digits')
      return
    }

    if (!form.id) {
      const { data, error } = await addressService.createAddress({
        ...form,
        user_id: user?.id,
      })

      if (error) {
        toast.error(error.message)
        return
      }

      setAddresses((state) => [data, ...state])
      toast.success('Address added')
      clearForm()
      return
    }

    const { data, error } = await addressService.updateAddress(form.id, form)

    if (error) {
      toast.error(error.message)
      return
    }

    setAddresses((state) =>
      state.map((address) => (address.id === form.id ? { ...address, ...data } : address)),
    )
    toast.success('Address updated')
    clearForm()
  }

  const handleEdit = (address) => {
    setForm({
      id: address.id,
      name: address.name,
      line1: address.line1,
      line2: address.line2,
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      phone: address.phone,
      label: address.label || 'home',
      isDefault: address.isDefault || address.is_default,
    })
  }

  const handleDelete = async (id) => {
    const { error } = await addressService.deleteAddress(id)

    if (error) {
      toast.error(error.message)
      return
    }

    setAddresses((state) => state.filter((address) => address.id !== id))
    toast.success('Address deleted')
  }

  const setAsDefault = async (id) => {
    const updated = addresses.map((address) => ({
      ...address,
      isDefault: address.id === id,
    }))
    setAddresses(updated)

    await Promise.all(
      updated.map((address) =>
        addressService.updateAddress(address.id, {
          is_default: address.isDefault,
        }),
      ),
    )

    toast.success('Default address updated')
  }

  const handleLogoutEverywhere = async () => {
    await signOutAllDevices()
    toast.success('Logged out from all devices')
    navigate('/login')
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <Card className="p-5">
        <SectionTitle
          action={
            <Button onClick={handleLogoutEverywhere} variant="outline">
              Logout All Devices
            </Button>
          }
          subtitle="Home, work, and more"
          title="Address Management"
        />

        <form className="space-y-3" onSubmit={handleSubmit}>
          <input
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            onChange={(event) => setForm((state) => ({ ...state, name: event.target.value }))}
            placeholder="Full name"
            value={form.name}
          />
          <input
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            onChange={(event) => setForm((state) => ({ ...state, line1: event.target.value }))}
            placeholder="Address line 1"
            value={form.line1}
          />
          <input
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            onChange={(event) => setForm((state) => ({ ...state, line2: event.target.value }))}
            placeholder="Address line 2"
            value={form.line2}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              onChange={(event) => setForm((state) => ({ ...state, city: event.target.value }))}
              placeholder="City"
              value={form.city}
            />
            <input
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              onChange={(event) => setForm((state) => ({ ...state, state: event.target.value }))}
              placeholder="State"
              value={form.state}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              onChange={(event) => setForm((state) => ({ ...state, pincode: event.target.value }))}
              placeholder="Pincode"
              value={form.pincode}
            />
            <input
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              onChange={(event) => setForm((state) => ({ ...state, phone: event.target.value }))}
              placeholder="Phone"
              value={form.phone}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <select
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              onChange={(event) => setForm((state) => ({ ...state, label: event.target.value }))}
              value={form.label}
            >
              <option value="home">Home</option>
              <option value="work">Work</option>
            </select>
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <input
                checked={form.isDefault}
                onChange={(event) =>
                  setForm((state) => ({
                    ...state,
                    isDefault: event.target.checked,
                  }))
                }
                type="checkbox"
              />
              Set default
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button type="submit">{form.id ? 'Update' : 'Add'} Address</Button>
            <Button onClick={validateDelivery} type="button" variant="outline">
              Check Delivery
            </Button>
          </div>

          {availability ? (
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {availability.available
                ? `Delivery available in ${availability.etaDays} day(s).`
                : 'Delivery unavailable for this pincode.'}
            </p>
          ) : null}
        </form>
      </Card>

      <div className="space-y-3">
        {addresses.length ? (
          addresses.map((address) => (
            <Card className="space-y-3 p-4" key={address.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{address.name}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {address.line1}, {address.line2}, {address.city}, {address.state} - {address.pincode}
                  </p>
                </div>
                <span className="rounded-full bg-brand-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-700 dark:bg-brand-900/30 dark:text-brand-200">
                  {address.label}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={() => handleEdit(address)} variant="outline">
                  Edit
                </Button>
                <Button onClick={() => handleDelete(address.id)} variant="danger">
                  Delete
                </Button>
                <Button onClick={() => setAsDefault(address.id)} variant="ghost">
                  {(address.isDefault || address.is_default) ? 'Default Address' : 'Set as default'}
                </Button>
              </div>
            </Card>
          ))
        ) : (
          <EmptyState
            description="Add your first address to speed up checkout and delivery estimates."
            title="No saved addresses"
          />
        )}
      </div>
    </div>
  )
}
