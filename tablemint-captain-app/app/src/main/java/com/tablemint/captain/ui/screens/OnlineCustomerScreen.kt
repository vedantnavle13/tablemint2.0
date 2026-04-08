package com.tablemint.captain.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tablemint.captain.data.models.*
import com.tablemint.captain.ui.theme.*
import com.tablemint.captain.viewmodel.CaptainViewModel
import com.tablemint.captain.viewmodel.UiState

@Composable
fun OnlineCustomerScreen(viewModel: CaptainViewModel, onBack: () -> Unit) {
    val lookupState by viewModel.lookupState.collectAsState()
    val menuState   by viewModel.menuState.collectAsState()
    val addItemsState by viewModel.addItemsState.collectAsState()
    val cart        by viewModel.cart.collectAsState()

    LaunchedEffect(Unit) { if (menuState is UiState.Idle) viewModel.loadMenu() }

    // Success dialog
    if (addItemsState is UiState.Success) {
        val result = (addItemsState as UiState.Success<AddItemsResponse>).data
        AlertDialog(
            onDismissRequest = { viewModel.resetAddItems(); viewModel.resetLookup(); onBack() },
            title = { Text("✅ Order Updated!", fontWeight = FontWeight.Bold) },
            text = {
                Column {
                    Text("Items added to the reservation.")
                    Spacer(Modifier.height(8.dp))
                    Text("New pre-order total: ₹${result.data.reservation.preOrderTotal.toInt()}",
                        fontWeight = FontWeight.Bold, color = Amber)
                    Spacer(Modifier.height(8.dp))
                    result.data.addedItems.forEach {
                        Text("• ${it.name} ×${it.quantity} = ₹${(it.price * it.quantity).toInt()}", fontSize = 13.sp)
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = { viewModel.resetAddItems(); viewModel.resetLookup(); onBack() },
                    colors = ButtonDefaults.buttonColors(containerColor = GreenColor)
                ) { Text("Done") }
            }
        )
    }

    Column(modifier = Modifier.fillMaxSize().background(BgMain)) {
        TopBar(title = "Online Customer", onBack = onBack)

        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item { CustomerIdSearch(onSearch = { viewModel.lookupCustomer(it) }, isLoading = lookupState is UiState.Loading) }

            if (lookupState is UiState.Error) {
                item { ErrorBanner((lookupState as UiState.Error).message) }
            }

            if (lookupState is UiState.Success) {
                val data = (lookupState as UiState.Success<CustomerLookupResponse>).data.data

                item { CustomerInfoCard(data.customer) }

                if (data.reservation != null) {
                    item { ReservationCard(data.reservation) }

                    if (cart.isNotEmpty()) {
                        item { CartSummaryCard(cart, viewModel.cartTotal) }
                    }

                    item { Text("Add Items from Menu", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextDark) }

                    if (menuState is UiState.Success) {
                        val menuItems: List<MenuItem> = (menuState as UiState.Success<MenuResponse>)
                            .data.data.menu.filter { menuEntry -> menuEntry.isAvailable }
                        val categories: List<String> = menuItems.map { menuEntry -> menuEntry.category }.distinct()

                        categories.forEach { cat ->
                            item {
                                val label = mapOf("main" to "Main Course", "starter" to "Starters",
                                    "dessert" to "Desserts", "beverage" to "Beverages",
                                    "special" to "Chef's Special")[cat] ?: cat
                                Text(label, fontSize = 13.sp, fontWeight = FontWeight.Bold,
                                    color = Amber, letterSpacing = 1.sp, modifier = Modifier.padding(top = 4.dp))
                            }
                            val filtered: List<MenuItem> = menuItems.filter { menuEntry -> menuEntry.category == cat }
                            items(filtered) { menuEntry ->
                                MenuItemRow(menuEntry, viewModel.getCartQuantity(menuEntry._id),
                                    onAdd = { viewModel.addToCart(menuEntry) },
                                    onRemove = { viewModel.removeFromCart(menuEntry) })
                            }
                        }

                        item {
                            if (addItemsState is UiState.Error) {
                                ErrorBanner((addItemsState as UiState.Error).message)
                                Spacer(Modifier.height(8.dp))
                            }
                            Button(
                                onClick = { viewModel.submitOnlineOrder(data.reservation._id) },
                                modifier = Modifier.fillMaxWidth().height(52.dp),
                                enabled = cart.isNotEmpty() && addItemsState !is UiState.Loading,
                                shape = RoundedCornerShape(12.dp),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = if (cart.isNotEmpty()) GreenColor else BorderColor)
                            ) {
                                if (addItemsState is UiState.Loading) {
                                    CircularProgressIndicator(color = BgCard, modifier = Modifier.size(20.dp))
                                } else {
                                    Text(
                                        if (cart.isEmpty()) "Add items to order"
                                        else "Confirm Order · ₹${viewModel.cartTotal.toInt()} →",
                                        fontSize = 15.sp, fontWeight = FontWeight.Bold
                                    )
                                }
                            }
                            Spacer(Modifier.height(24.dp))
                        }
                    }
                } else {
                    item {
                        Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(14.dp),
                            colors = CardDefaults.cardColors(containerColor = BgCard)) {
                            Column(modifier = Modifier.padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                Text("📋", fontSize = 36.sp, textAlign = TextAlign.Center)
                                Spacer(Modifier.height(8.dp))
                                Text("No Active Reservation", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextDark)
                                Text("This customer has no active reservation at your restaurant.",
                                    fontSize = 13.sp, color = TextMuted, textAlign = TextAlign.Center,
                                    modifier = Modifier.padding(top = 6.dp))
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun CustomerIdSearch(onSearch: (String) -> Unit, isLoading: Boolean) {
    var id by remember { mutableStateOf("") }
    Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = BgCard), elevation = CardDefaults.cardElevation(2.dp)) {
        Column(modifier = Modifier.padding(20.dp)) {
            Text("Customer ID Lookup", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextDark)
            Text("Ask the customer for their 9-digit TableMint ID",
                fontSize = 13.sp, color = TextMuted, modifier = Modifier.padding(top = 4.dp, bottom = 16.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                OutlinedTextField(
                    value = id,
                    onValueChange = { if (it.length <= 9 && it.all { c -> c.isDigit() }) id = it },
                    placeholder = { Text("9-digit ID", color = TextMuted) },
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(10.dp),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Amber, unfocusedBorderColor = BorderColor),
                    textStyle = LocalTextStyle.current.copy(fontSize = 22.sp, fontWeight = FontWeight.Bold,
                        letterSpacing = 4.sp, textAlign = TextAlign.Center)
                )
                Spacer(Modifier.width(10.dp))
                Button(onClick = { onSearch(id) }, enabled = id.length == 9 && !isLoading,
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Amber),
                    modifier = Modifier.height(56.dp)) {
                    if (isLoading) CircularProgressIndicator(color = BgCard, modifier = Modifier.size(18.dp))
                    else Icon(Icons.Default.Search, contentDescription = null)
                }
            }
        }
    }
}

@Composable
fun CustomerInfoCard(customer: CustomerInfo) {
    Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = AmberLight),
        border = BorderStroke(1.dp, Amber.copy(alpha = 0.3f))) {
        Row(modifier = Modifier.padding(18.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(modifier = Modifier.size(48.dp).clip(CircleShape).background(Amber.copy(alpha = 0.2f)),
                contentAlignment = Alignment.Center) {
                Text(customer.name.firstOrNull()?.uppercase() ?: "?",
                    fontSize = 20.sp, fontWeight = FontWeight.Bold, color = Amber)
            }
            Spacer(Modifier.width(14.dp))
            Column {
                Text(customer.name, fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextDark)
                Text(customer.email, fontSize = 12.sp, color = TextMid)
                if (!customer.phone.isNullOrBlank()) Text(customer.phone, fontSize = 12.sp, color = TextMid)
                Surface(color = Amber, shape = RoundedCornerShape(20.dp), modifier = Modifier.padding(top = 6.dp)) {
                    Text("ID: ${customer.customerId}", fontSize = 11.sp, fontWeight = FontWeight.Bold,
                        color = BgCard, modifier = Modifier.padding(horizontal = 10.dp, vertical = 3.dp),
                        letterSpacing = 1.sp)
                }
            }
        }
    }
}

@Composable
fun ReservationCard(reservation: ReservationInfo) {
    Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = BgCard), elevation = CardDefaults.cardElevation(2.dp)) {
        Column(modifier = Modifier.padding(18.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically) {
                Text("Active Reservation", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = TextDark)
                Surface(color = GreenLight, shape = RoundedCornerShape(20.dp),
                    border = BorderStroke(1.dp, GreenColor.copy(alpha = 0.4f))) {
                    Text(reservation.status.uppercase(), fontSize = 10.sp, fontWeight = FontWeight.Bold,
                        color = GreenColor, modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                        letterSpacing = 1.sp)
                }
            }
            Spacer(Modifier.height(12.dp))
            Row {
                InfoChip("👥 ${reservation.numberOfGuests} Guests")
                Spacer(Modifier.width(8.dp))
                InfoChip("₹${reservation.reservationFee.toInt()} Fee Paid")
            }
            if (reservation.preOrderItems.isNotEmpty()) {
                HorizontalDivider(modifier = Modifier.padding(vertical = 12.dp), color = BorderColor)
                Text("Pre-ordered Items", fontSize = 12.sp, color = TextMuted,
                    fontWeight = FontWeight.Bold, modifier = Modifier.padding(bottom = 8.dp))
                reservation.preOrderItems.forEach { item ->
                    Row(modifier = Modifier.fillMaxWidth().padding(vertical = 3.dp),
                        horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("${item.name} ×${item.quantity}", fontSize = 13.sp, color = TextMid)
                        Text("₹${(item.price * item.quantity).toInt()}", fontSize = 13.sp,
                            color = TextDark, fontWeight = FontWeight.SemiBold)
                    }
                }
                HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp), color = BorderColor)
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Pre-order Total", fontWeight = FontWeight.Bold, color = TextDark)
                    Text("₹${reservation.preOrderTotal.toInt()}", fontWeight = FontWeight.Bold, color = Amber)
                }
            }
        }
    }
}

@Composable
fun CartSummaryCard(cart: List<CartItem>, total: Double) {
    Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = GreenLight),
        border = BorderStroke(1.dp, GreenColor.copy(alpha = 0.3f))) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text("Items to Add (${cart.sumOf { it.quantity }})",
                fontSize = 14.sp, fontWeight = FontWeight.Bold, color = TextDark)
            Spacer(Modifier.height(8.dp))
            cart.forEach { cartItem ->
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("${cartItem.menuItem.name} ×${cartItem.quantity}", fontSize = 13.sp, color = TextMid)
                    Text("₹${(cartItem.menuItem.price * cartItem.quantity).toInt()}",
                        fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = GreenColor)
                }
            }
            HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp), color = GreenColor.copy(alpha = 0.2f))
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("To Add", fontWeight = FontWeight.Bold, color = TextDark)
                Text("₹${total.toInt()}", fontWeight = FontWeight.Bold, color = GreenColor, fontSize = 16.sp)
            }
        }
    }
}
