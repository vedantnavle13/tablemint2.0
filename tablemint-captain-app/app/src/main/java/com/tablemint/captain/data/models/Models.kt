package com.tablemint.captain.data.models

data class LoginRequest(val email: String, val password: String)

data class LoginResponse(
    val status: String,
    val token: String,
    val data: UserData
)

data class UserData(val user: User)

data class User(
    val id: String,
    val name: String,
    val email: String,
    val role: String,
    val assignedRestaurant: String?
)

// Menu
data class MenuResponse(
    val status: String,
    val data: MenuData
)

data class MenuData(
    val restaurant: RestaurantInfo,
    val menu: List<MenuItem>
)

data class RestaurantInfo(val id: String, val name: String)

data class MenuItem(
    val _id: String,
    val name: String,
    val price: Double,
    val category: String,
    val isVeg: Boolean,
    val description: String?,
    val isAvailable: Boolean
)

// Customer lookup
data class CustomerLookupResponse(
    val status: String,
    val data: CustomerLookupData
)

data class CustomerLookupData(
    val customer: CustomerInfo,
    val reservation: ReservationInfo?
)

data class CustomerInfo(
    val id: String,
    val customerId: String,
    val name: String,
    val phone: String?,
    val email: String
)

data class ReservationInfo(
    val _id: String,
    val status: String,
    val scheduledAt: String,
    val numberOfGuests: Int,
    val preOrderItems: List<PreOrderItem>,
    val preOrderTotal: Double,
    val reservationFee: Double,
    val specialRequests: String?
)

data class PreOrderItem(
    val name: String,
    val price: Double,
    val quantity: Int
)

// Add items
data class AddItemsRequest(val items: List<OrderItem>)
data class OrderItem(val menuItemId: String, val quantity: Int)

data class AddItemsResponse(
    val status: String,
    val message: String,
    val data: AddItemsData
)

data class AddItemsData(
    val addedItems: List<AddedItem>,
    val reservation: UpdatedReservation
)

data class AddedItem(val name: String, val quantity: Int, val price: Double)

data class UpdatedReservation(
    val id: String,
    val preOrderTotal: Double,
    val totalAmount: Double,
    val preOrderItems: List<PreOrderItem>
)

// ── Walk-in order (new clean flow via /captain/walk-in) ───────────────────────

data class WalkInRequest(
    val items: List<OrderItem>,
    val tableNumber: String,
    val customerName: String
)

data class WalkInResponse(
    val status: String,
    val message: String,
    val data: WalkInOrderData
)

data class WalkInOrderData(
    val orderId: String,
    val walkInId: String,        // "WI-84729103" — display to customer for reference
    val transactionId: String,   // "TXN-4F9A2C1D"
    val customerName: String,
    val tableNumber: String,
    val items: List<PreOrderItem>,
    val subtotal: Double,
    val tax: Double,
    val grandTotal: Double,
    val paymentStatus: String
)

data class MarkPaidRequest(val dummy: String = "") // body not required by server

data class MarkPaidResponse(
    val status: String,
    val message: String,
    val data: MarkPaidData
)

data class MarkPaidData(
    val orderId: String,
    val walkInId: String,
    val transactionId: String,
    val paymentStatus: String,
    val paidAt: String?,
    val grandTotal: Double
)

// Cart item (local state)
data class CartItem(
    val menuItem: MenuItem,
    var quantity: Int
)
