package com.tablemint.captain.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tablemint.captain.data.api.RetrofitClient
import com.tablemint.captain.data.models.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

sealed class UiState<out T> {
    object Idle : UiState<Nothing>()
    object Loading : UiState<Nothing>()
    data class Success<T>(val data: T) : UiState<T>()
    data class Error(val message: String) : UiState<Nothing>()
}

class CaptainViewModel : ViewModel() {

    private val api = RetrofitClient.apiService

    // ── Auth ─────────────────────────────────────────────────────────────────
    var token: String = ""
    var captainName: String = ""
    var restaurantName: String = ""

    private val _loginState = MutableStateFlow<UiState<LoginResponse>>(UiState.Idle)
    val loginState: StateFlow<UiState<LoginResponse>> = _loginState

    fun login(email: String, password: String) {
        viewModelScope.launch {
            _loginState.value = UiState.Loading
            try {
                val response = api.login(LoginRequest(email, password))
                if (response.isSuccessful && response.body() != null) {
                    val body = response.body()!!
                    token = "Bearer ${body.token}"
                    captainName = body.data.user.name
                    _loginState.value = UiState.Success(body)
                } else {
                    val errorMsg = when (response.code()) {
                        401 -> "Invalid email or password"
                        403 -> "Access denied. Only admins and captains can use this app."
                        else -> "Login failed (${response.code()})"
                    }
                    _loginState.value = UiState.Error(errorMsg)
                }
            } catch (e: Exception) {
                _loginState.value = UiState.Error("Cannot connect to server. Check your network.")
            }
        }
    }

    fun resetLoginState() { _loginState.value = UiState.Idle }

    fun logout() {
        token = ""
        captainName = ""
        restaurantName = ""
        _loginState.value = UiState.Idle
        _menuState.value = UiState.Idle
        _lookupState.value = UiState.Idle
        _walkInState.value = UiState.Idle
        _payState.value = UiState.Idle
        clearCart()
    }

    // ── Menu ─────────────────────────────────────────────────────────────────
    private val _menuState = MutableStateFlow<UiState<MenuResponse>>(UiState.Idle)
    val menuState: StateFlow<UiState<MenuResponse>> = _menuState

    fun loadMenu() {
        viewModelScope.launch {
            _menuState.value = UiState.Loading
            try {
                val response = api.getMenu(token)
                if (response.isSuccessful && response.body() != null) {
                    restaurantName = response.body()!!.data.restaurant.name
                    _menuState.value = UiState.Success(response.body()!!)
                } else {
                    _menuState.value = UiState.Error("Failed to load menu.")
                }
            } catch (e: Exception) {
                _menuState.value = UiState.Error("Network error. Check connection.")
            }
        }
    }

    // ── Cart ─────────────────────────────────────────────────────────────────
    private val _cart = MutableStateFlow<List<CartItem>>(emptyList())
    val cart: StateFlow<List<CartItem>> = _cart

    fun addToCart(item: MenuItem) {
        val current = _cart.value.toMutableList()
        val existing = current.find { it.menuItem._id == item._id }
        if (existing != null) {
            existing.quantity++
        } else {
            current.add(CartItem(item, 1))
        }
        _cart.value = current.toList()
    }

    fun removeFromCart(item: MenuItem) {
        val current = _cart.value.toMutableList()
        val existing = current.find { it.menuItem._id == item._id }
        if (existing != null) {
            if (existing.quantity > 1) existing.quantity--
            else current.remove(existing)
        }
        _cart.value = current.toList()
    }

    fun clearCart() { _cart.value = emptyList() }

    fun getCartQuantity(itemId: String): Int =
        _cart.value.find { it.menuItem._id == itemId }?.quantity ?: 0

    val cartTotal: Double
        get() = _cart.value.sumOf { it.menuItem.price * it.quantity }

    val cartItemCount: Int
        get() = _cart.value.sumOf { it.quantity }

    // ── Online Customer Lookup ────────────────────────────────────────────────
    private val _lookupState = MutableStateFlow<UiState<CustomerLookupResponse>>(UiState.Idle)
    val lookupState: StateFlow<UiState<CustomerLookupResponse>> = _lookupState

    fun lookupCustomer(customerId: String) {
        viewModelScope.launch {
            _lookupState.value = UiState.Loading
            try {
                val response = api.lookupCustomer(token, customerId)
                if (response.isSuccessful && response.body() != null) {
                    _lookupState.value = UiState.Success(response.body()!!)
                } else {
                    _lookupState.value = UiState.Error("Customer not found.")
                }
            } catch (e: Exception) {
                _lookupState.value = UiState.Error("Network error.")
            }
        }
    }

    fun resetLookup() {
        _lookupState.value = UiState.Idle
        clearCart()
    }

    // ── Add items to online reservation ──────────────────────────────────────
    private val _addItemsState = MutableStateFlow<UiState<AddItemsResponse>>(UiState.Idle)
    val addItemsState: StateFlow<UiState<AddItemsResponse>> = _addItemsState

    fun submitOnlineOrder(reservationId: String) {
        val items = _cart.value.map { OrderItem(it.menuItem._id, it.quantity) }
        if (items.isEmpty()) return
        viewModelScope.launch {
            _addItemsState.value = UiState.Loading
            try {
                val response = api.addItemsToReservation(token, reservationId, AddItemsRequest(items))
                if (response.isSuccessful && response.body() != null) {
                    _addItemsState.value = UiState.Success(response.body()!!)
                    clearCart()
                } else {
                    _addItemsState.value = UiState.Error("Failed to add items.")
                }
            } catch (e: Exception) {
                _addItemsState.value = UiState.Error("Network error.")
            }
        }
    }

    fun resetAddItems() { _addItemsState.value = UiState.Idle }

    // ── Walk-in order (new /captain/walk-in endpoint) ─────────────────────────
    private val _walkInState = MutableStateFlow<UiState<WalkInResponse>>(UiState.Idle)
    val walkInState: StateFlow<UiState<WalkInResponse>> = _walkInState

    fun submitWalkInOrder(tableNumber: String, customerName: String) {
        val items = _cart.value.map { OrderItem(it.menuItem._id, it.quantity) }
        if (items.isEmpty()) return
        viewModelScope.launch {
            _walkInState.value = UiState.Loading
            try {
                val response = api.createWalkIn(
                    token,
                    WalkInRequest(items, tableNumber, customerName)
                )
                if (response.isSuccessful && response.body() != null) {
                    _walkInState.value = UiState.Success(response.body()!!)
                    clearCart()
                } else {
                    _walkInState.value = UiState.Error("Failed to send walk-in order to admin.")
                }
            } catch (e: Exception) {
                _walkInState.value = UiState.Error("Network error. Check connection.")
            }
        }
    }

    fun resetWalkInState() { _walkInState.value = UiState.Idle }

    // ── Mark walk-in order as paid ────────────────────────────────────────────
    private val _payState = MutableStateFlow<UiState<MarkPaidResponse>>(UiState.Idle)
    val payState: StateFlow<UiState<MarkPaidResponse>> = _payState

    fun markWalkInPaid(orderId: String) {
        viewModelScope.launch {
            _payState.value = UiState.Loading
            try {
                val response = api.markWalkInPaid(token, orderId)
                if (response.isSuccessful && response.body() != null) {
                    _payState.value = UiState.Success(response.body()!!)
                } else {
                    val code = response.code()
                    _payState.value = UiState.Error(
                        if (code == 400) "Order is already marked as paid."
                        else "Failed to mark as paid ($code)."
                    )
                }
            } catch (e: Exception) {
                _payState.value = UiState.Error("Network error. Could not mark as paid.")
            }
        }
    }

    fun resetPayState() { _payState.value = UiState.Idle }
}
