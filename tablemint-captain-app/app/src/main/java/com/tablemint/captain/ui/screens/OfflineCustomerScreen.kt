package com.tablemint.captain.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tablemint.captain.data.models.*
import com.tablemint.captain.ui.theme.*
import com.tablemint.captain.viewmodel.CaptainViewModel
import com.tablemint.captain.viewmodel.UiState

@Composable
fun OfflineCustomerScreen(viewModel: CaptainViewModel, onBack: () -> Unit) {
    val menuState    by viewModel.menuState.collectAsState()
    val offlineState by viewModel.offlineState.collectAsState()
    val cart         by viewModel.cart.collectAsState()

    var customerName by remember { mutableStateOf("") }
    var tableNumber  by remember { mutableStateOf("") }

    LaunchedEffect(Unit) { if (menuState is UiState.Idle) viewModel.loadMenu() }

    // Success dialog
    if (offlineState is UiState.Success) {
        val result = (offlineState as UiState.Success<OfflineOrderResponse>).data
        AlertDialog(
            onDismissRequest = { viewModel.resetOfflineState(); onBack() },
            title = { Text("✅ Bill Sent!", fontWeight = FontWeight.Bold) },
            text = {
                Column {
                    Text("Order sent to the admin panel.", fontSize = 14.sp)
                    Spacer(Modifier.height(12.dp))
                    Surface(color = AmberLight, shape = RoundedCornerShape(10.dp)) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Text("Customer: ${result.data.customerName}", fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                            Text("Table: ${result.data.tableNumber}", fontSize = 13.sp)
                            HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp), color = BorderColor)
                            result.data.items.forEach { orderItem ->
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text("${orderItem.name} ×${orderItem.quantity}", fontSize = 12.sp, color = TextMid)
                                    Text("₹${(orderItem.price * orderItem.quantity).toInt()}", fontSize = 12.sp)
                                }
                            }
                            HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp), color = BorderColor)
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("Total", fontWeight = FontWeight.Bold)
                                Text("₹${result.data.total.toInt()}", fontWeight = FontWeight.Bold, color = Amber, fontSize = 16.sp)
                            }
                        }
                    }
                }
            },
            confirmButton = {
                Button(onClick = { viewModel.resetOfflineState(); onBack() },
                    colors = ButtonDefaults.buttonColors(containerColor = Amber)) { Text("Done") }
            }
        )
    }

    Column(modifier = Modifier.fillMaxSize().background(BgMain)) {
        TopBar(title = "Walk-in Customer", onBack = onBack)

        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Customer details card
            item {
                Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = BgCard), elevation = CardDefaults.cardElevation(2.dp)) {
                    Column(modifier = Modifier.padding(20.dp)) {
                        Text("Customer Details (Optional)", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = TextDark)
                        Text("Leave blank for anonymous walk-in",
                            fontSize = 12.sp, color = TextMuted, modifier = Modifier.padding(top = 4.dp, bottom = 16.dp))
                        OutlinedTextField(
                            value = customerName, onValueChange = { customerName = it },
                            label = { Text("Customer Name") }, modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(10.dp), singleLine = true,
                            colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = GreenColor, unfocusedBorderColor = BorderColor))
                        Spacer(Modifier.height(12.dp))
                        OutlinedTextField(
                            value = tableNumber, onValueChange = { tableNumber = it },
                            label = { Text("Table Number (e.g. T3)") }, modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(10.dp), singleLine = true,
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Text),
                            colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = GreenColor, unfocusedBorderColor = BorderColor))
                    }
                }
            }

            // Cart
            if (cart.isNotEmpty()) {
                item {
                    Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(14.dp),
                        colors = CardDefaults.cardColors(containerColor = GreenLight),
                        border = BorderStroke(1.dp, GreenColor.copy(alpha = 0.3f))) {
                        Column(modifier = Modifier.padding(18.dp)) {
                            Row(modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically) {
                                Text("Current Order (${viewModel.cartItemCount} items)",
                                    fontSize = 15.sp, fontWeight = FontWeight.Bold, color = TextDark)
                                Text("₹${viewModel.cartTotal.toInt()}",
                                    fontSize = 18.sp, fontWeight = FontWeight.Bold, color = GreenColor)
                            }
                            Spacer(Modifier.height(10.dp))
                            cart.forEach { cartItem ->
                                Row(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically) {
                                    Text(cartItem.menuItem.name, fontSize = 13.sp,
                                        color = TextMid, modifier = Modifier.weight(1f))
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        SmallCounterButton("−") { viewModel.removeFromCart(cartItem.menuItem) }
                                        Text("${cartItem.quantity}", fontSize = 14.sp,
                                            fontWeight = FontWeight.Bold, color = TextDark,
                                            modifier = Modifier.padding(horizontal = 10.dp))
                                        SmallCounterButton("+") { viewModel.addToCart(cartItem.menuItem) }
                                        Spacer(Modifier.width(8.dp))
                                        Text("₹${(cartItem.menuItem.price * cartItem.quantity).toInt()}",
                                            fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = GreenColor)
                                    }
                                }
                            }
                        }
                    }
                }

                item {
                    if (offlineState is UiState.Error) {
                        ErrorBanner((offlineState as UiState.Error).message)
                        Spacer(Modifier.height(8.dp))
                    }
                    Button(
                        onClick = {
                            viewModel.submitOfflineOrder(
                                tableNumber.ifBlank { "N/A" },
                                customerName.ifBlank { "Walk-in Customer" }
                            )
                        },
                        modifier = Modifier.fillMaxWidth().height(54.dp),
                        enabled = offlineState !is UiState.Loading,
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = GreenColor)
                    ) {
                        if (offlineState is UiState.Loading) {
                            CircularProgressIndicator(color = BgCard, modifier = Modifier.size(20.dp))
                        } else {
                            Icon(Icons.Default.Send, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(Modifier.width(8.dp))
                            Text("Send Bill to Admin · ₹${viewModel.cartTotal.toInt()}",
                                fontSize = 15.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }

            // Menu header
            item { Text("Menu", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextDark) }

            if (menuState is UiState.Loading) {
                item {
                    Box(modifier = Modifier.fillMaxWidth().padding(24.dp), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = Amber)
                    }
                }
            }

            if (menuState is UiState.Success) {
                val menuItems: List<MenuItem> = (menuState as UiState.Success<MenuResponse>)
                    .data.data.menu.filter { menuEntry -> menuEntry.isAvailable }
                val categories: List<String> = menuItems.map { menuEntry -> menuEntry.category }.distinct()

                categories.forEach { cat ->
                    item {
                        val label = mapOf("main" to "Main Course", "starter" to "Starters",
                            "dessert" to "Desserts", "beverage" to "Beverages",
                            "special" to "Chef's Special")[cat] ?: cat
                        Text(label, fontSize = 12.sp, fontWeight = FontWeight.Bold,
                            color = GreenColor, letterSpacing = 1.sp, modifier = Modifier.padding(top = 4.dp))
                    }
                    val filtered: List<MenuItem> = menuItems.filter { menuEntry -> menuEntry.category == cat }
                    items(filtered) { menuEntry ->
                        MenuItemRow(item = menuEntry, quantity = viewModel.getCartQuantity(menuEntry._id),
                            onAdd = { viewModel.addToCart(menuEntry) },
                            onRemove = { viewModel.removeFromCart(menuEntry) },
                            accentColor = GreenColor)
                    }
                }
            }

            item { Spacer(Modifier.height(24.dp)) }
        }
    }
}

@Composable
fun SmallCounterButton(text: String, onClick: () -> Unit) {
    Box(modifier = Modifier.size(28.dp).clip(RoundedCornerShape(6.dp)).background(BorderColor),
        contentAlignment = Alignment.Center) {
        IconButton(onClick = onClick, modifier = Modifier.size(28.dp)) {
            Text(text, fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextDark)
        }
    }
}
