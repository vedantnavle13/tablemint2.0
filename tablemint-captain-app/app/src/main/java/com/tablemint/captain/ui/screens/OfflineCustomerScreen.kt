package com.tablemint.captain.ui.screens

import androidx.compose.animation.*
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tablemint.captain.data.models.*
import com.tablemint.captain.ui.theme.*
import com.tablemint.captain.viewmodel.CaptainViewModel
import com.tablemint.captain.viewmodel.UiState

// ─────────────────────────────────────────────────────────────────────────────
// Walk-in Order Confirmation Card
// Shown after a walk-in order is successfully created.
// Displays walkInId (customer reference), transactionId, itemized bill, and
// a "Mark as Paid" button that calls PATCH /captain/walk-in/:id/pay.
// ─────────────────────────────────────────────────────────────────────────────
@Composable
fun WalkInConfirmationCard(
    order: WalkInOrderData,
    payState: UiState<*>,
    onMarkPaid: () -> Unit,
    onDone: () -> Unit
) {
    // Track whether payment was recorded in this session
    val isPaid = order.paymentStatus == "paid" || payState is UiState.Success

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.55f)),
        contentAlignment = Alignment.BottomCenter
    ) {
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp),
            colors = CardDefaults.cardColors(containerColor = BgCard),
            elevation = CardDefaults.cardElevation(defaultElevation = 16.dp)
        ) {
            Column(modifier = Modifier.padding(horizontal = 24.dp, vertical = 28.dp)) {

                // ── Header ──────────────────────────────────────────────────
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            "✅ Order Sent to Admin",
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold,
                            color = TextDark
                        )
                        Text(
                            "Walk-in order confirmed",
                            fontSize = 12.sp,
                            color = TextMuted,
                            modifier = Modifier.padding(top = 2.dp)
                        )
                    }
                    if (isPaid) {
                        Surface(
                            color = GreenColor.copy(alpha = 0.12f),
                            shape = RoundedCornerShape(20.dp),
                            border = BorderStroke(1.dp, GreenColor.copy(alpha = 0.4f))
                        ) {
                            Text(
                                "✓ PAID",
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = GreenColor
                            )
                        }
                    }
                }

                Spacer(Modifier.height(20.dp))

                // ── IDs box (customer reference) ─────────────────────────
                Surface(
                    color = AmberLight,
                    shape = RoundedCornerShape(14.dp),
                    border = BorderStroke(1.dp, Amber.copy(alpha = 0.3f)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            "Customer Reference",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = TextMuted,
                            letterSpacing = 0.8.sp
                        )
                        Spacer(Modifier.height(8.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("🎫 Walk-in ID", fontSize = 13.sp, color = TextMid, fontWeight = FontWeight.SemiBold)
                            Text(
                                order.walkInId,
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Bold,
                                color = Amber,
                                fontFamily = FontFamily.Monospace
                            )
                        }
                        Spacer(Modifier.height(6.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("Transaction", fontSize = 12.sp, color = TextMuted)
                            Text(
                                order.transactionId,
                                fontSize = 12.sp,
                                color = TextMid,
                                fontFamily = FontFamily.Monospace
                            )
                        }
                        Spacer(Modifier.height(6.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("Table", fontSize = 12.sp, color = TextMuted)
                            Text(order.tableNumber, fontSize = 12.sp, color = TextDark, fontWeight = FontWeight.SemiBold)
                        }
                        if (order.customerName != "Walk-in Customer") {
                            Spacer(Modifier.height(4.dp))
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text("Customer", fontSize = 12.sp, color = TextMuted)
                                Text(order.customerName, fontSize = 12.sp, color = TextDark, fontWeight = FontWeight.SemiBold)
                            }
                        }
                    }
                }

                Spacer(Modifier.height(16.dp))

                // ── Itemized bill ────────────────────────────────────────
                Surface(
                    color = BgSoft,
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        order.items.forEach { item ->
                            Row(
                                modifier = Modifier.fillMaxWidth().padding(vertical = 3.dp),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(
                                    "${item.name} ×${item.quantity}",
                                    fontSize = 13.sp,
                                    color = TextMid,
                                    modifier = Modifier.weight(1f)
                                )
                                Text(
                                    "₹${(item.price * item.quantity).toInt()}",
                                    fontSize = 13.sp,
                                    color = TextDark,
                                    fontWeight = FontWeight.SemiBold
                                )
                            }
                        }

                        HorizontalDivider(modifier = Modifier.padding(vertical = 10.dp), color = BorderColor)

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("Subtotal", fontSize = 12.sp, color = TextMuted)
                            Text("₹${order.subtotal.toInt()}", fontSize = 12.sp, color = TextMid)
                        }
                        Spacer(Modifier.height(4.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("GST (18%)", fontSize = 12.sp, color = TextMuted)
                            Text("₹${"%.2f".format(order.tax)}", fontSize = 12.sp, color = TextMid)
                        }
                        Spacer(Modifier.height(8.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("Grand Total", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = TextDark)
                            Text(
                                "₹${"%.2f".format(order.grandTotal)}",
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold,
                                color = Amber
                            )
                        }
                    }
                }

                Spacer(Modifier.height(20.dp))

                // ── Error banner ─────────────────────────────────────────
                if (payState is UiState.Error) {
                    ErrorBanner((payState as UiState.Error).message)
                    Spacer(Modifier.height(12.dp))
                }

                // ── Action buttons ────────────────────────────────────────
                if (!isPaid) {
                    Button(
                        onClick = onMarkPaid,
                        modifier = Modifier.fillMaxWidth().height(52.dp),
                        enabled = payState !is UiState.Loading,
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = GreenColor)
                    ) {
                        if (payState is UiState.Loading) {
                            CircularProgressIndicator(
                                color = BgCard,
                                modifier = Modifier.size(20.dp),
                                strokeWidth = 2.dp
                            )
                        } else {
                            Icon(Icons.Default.CheckCircle, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(Modifier.width(8.dp))
                            Text("✅ Mark as Paid", fontSize = 15.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                    Spacer(Modifier.height(10.dp))
                } else {
                    // Paid confirmation banner
                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        color = GreenColor.copy(alpha = 0.10f),
                        shape = RoundedCornerShape(12.dp),
                        border = BorderStroke(1.dp, GreenColor.copy(alpha = 0.35f))
                    ) {
                        Text(
                            "✅ Payment Recorded Successfully",
                            modifier = Modifier.padding(14.dp),
                            textAlign = TextAlign.Center,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = GreenColor
                        )
                    }
                    Spacer(Modifier.height(10.dp))
                }

                OutlinedButton(
                    onClick = onDone,
                    modifier = Modifier.fillMaxWidth().height(48.dp),
                    shape = RoundedCornerShape(12.dp),
                    border = BorderStroke(1.5.dp, BorderColor)
                ) {
                    Text("Done", fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = TextMid)
                }

                Spacer(Modifier.height(8.dp))
            }
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Walk-in Screen
// ─────────────────────────────────────────────────────────────────────────────
@Composable
fun OfflineCustomerScreen(viewModel: CaptainViewModel, onBack: () -> Unit) {
    val menuState    by viewModel.menuState.collectAsState()
    val walkInState  by viewModel.walkInState.collectAsState()
    val payState     by viewModel.payState.collectAsState()
    val cart         by viewModel.cart.collectAsState()

    var customerName by remember { mutableStateOf("") }
    var tableNumber  by remember { mutableStateOf("") }

    LaunchedEffect(Unit) { if (menuState is UiState.Idle) viewModel.loadMenu() }

    Box(modifier = Modifier.fillMaxSize()) {
        Column(modifier = Modifier.fillMaxSize().background(BgMain)) {
            TopBar(title = "Walk-in Customer", onBack = onBack)

            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // ── Customer details card ─────────────────────────────────
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = BgCard),
                        elevation = CardDefaults.cardElevation(2.dp)
                    ) {
                        Column(modifier = Modifier.padding(20.dp)) {
                            Text(
                                "Customer Details (Optional)",
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Bold,
                                color = TextDark
                            )
                            Text(
                                "Leave blank for anonymous walk-in",
                                fontSize = 12.sp,
                                color = TextMuted,
                                modifier = Modifier.padding(top = 4.dp, bottom = 16.dp)
                            )
                            OutlinedTextField(
                                value = customerName,
                                onValueChange = { customerName = it },
                                label = { Text("Customer Name") },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(10.dp),
                                singleLine = true,
                                leadingIcon = { Icon(Icons.Default.Person, contentDescription = null, tint = TextMuted) },
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = GreenColor,
                                    unfocusedBorderColor = BorderColor
                                )
                            )
                            Spacer(Modifier.height(12.dp))
                            OutlinedTextField(
                                value = tableNumber,
                                onValueChange = { tableNumber = it },
                                label = { Text("Table Number (e.g. T3)") },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(10.dp),
                                singleLine = true,
                                leadingIcon = { Icon(Icons.Default.TableRestaurant, contentDescription = null, tint = TextMuted) },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Text),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = GreenColor,
                                    unfocusedBorderColor = BorderColor
                                )
                            )
                        }
                    }
                }

                // ── Cart summary ──────────────────────────────────────────
                if (cart.isNotEmpty()) {
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(14.dp),
                            colors = CardDefaults.cardColors(containerColor = GreenLight),
                            border = BorderStroke(1.dp, GreenColor.copy(alpha = 0.3f))
                        ) {
                            Column(modifier = Modifier.padding(18.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        "Current Order (${viewModel.cartItemCount} items)",
                                        fontSize = 15.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = TextDark
                                    )
                                    Text(
                                        "₹${viewModel.cartTotal.toInt()}",
                                        fontSize = 18.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = GreenColor
                                    )
                                }
                                Spacer(Modifier.height(10.dp))
                                cart.forEach { cartItem ->
                                    Row(
                                        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(
                                            cartItem.menuItem.name,
                                            fontSize = 13.sp,
                                            color = TextMid,
                                            modifier = Modifier.weight(1f)
                                        )
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            SmallCounterButton("−") { viewModel.removeFromCart(cartItem.menuItem) }
                                            Text(
                                                "${cartItem.quantity}",
                                                fontSize = 14.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = TextDark,
                                                modifier = Modifier.padding(horizontal = 10.dp)
                                            )
                                            SmallCounterButton("+") { viewModel.addToCart(cartItem.menuItem) }
                                            Spacer(Modifier.width(8.dp))
                                            Text(
                                                "₹${(cartItem.menuItem.price * cartItem.quantity).toInt()}",
                                                fontSize = 13.sp,
                                                fontWeight = FontWeight.SemiBold,
                                                color = GreenColor
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // ── Send button ───────────────────────────────────────
                    item {
                        if (walkInState is UiState.Error) {
                            ErrorBanner((walkInState as UiState.Error).message)
                            Spacer(Modifier.height(8.dp))
                        }
                        Button(
                            onClick = {
                                viewModel.submitWalkInOrder(
                                    tableNumber.ifBlank { "N/A" },
                                    customerName.ifBlank { "Walk-in Customer" }
                                )
                            },
                            modifier = Modifier.fillMaxWidth().height(54.dp),
                            enabled = walkInState !is UiState.Loading,
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = GreenColor)
                        ) {
                            if (walkInState is UiState.Loading) {
                                CircularProgressIndicator(color = BgCard, modifier = Modifier.size(20.dp))
                            } else {
                                Icon(Icons.Default.Send, contentDescription = null, modifier = Modifier.size(18.dp))
                                Spacer(Modifier.width(8.dp))
                                Text(
                                    "Send Order to Admin · ₹${viewModel.cartTotal.toInt()}",
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }
                }

                // ── Menu header ───────────────────────────────────────────
                item { Text("Menu", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextDark) }

                if (menuState is UiState.Loading) {
                    item {
                        Box(
                            modifier = Modifier.fillMaxWidth().padding(24.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            CircularProgressIndicator(color = Amber)
                        }
                    }
                }

                if (menuState is UiState.Success) {
                    val menuItems = (menuState as UiState.Success<MenuResponse>)
                        .data.data.menu.filter { it.isAvailable }
                    val categories = menuItems.map { it.category }.distinct()

                    categories.forEach { cat ->
                        item {
                            val label = mapOf(
                                "main" to "Main Course",
                                "starter" to "Starters",
                                "dessert" to "Desserts",
                                "beverage" to "Beverages",
                                "special" to "Chef's Special"
                            )[cat] ?: cat
                            Text(
                                label,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = GreenColor,
                                letterSpacing = 1.sp,
                                modifier = Modifier.padding(top = 4.dp)
                            )
                        }
                        val filtered = menuItems.filter { it.category == cat }
                        items(filtered) { menuItem ->
                            MenuItemRow(
                                item = menuItem,
                                quantity = viewModel.getCartQuantity(menuItem._id),
                                onAdd = { viewModel.addToCart(menuItem) },
                                onRemove = { viewModel.removeFromCart(menuItem) },
                                accentColor = GreenColor
                            )
                        }
                    }
                }

                item { Spacer(Modifier.height(24.dp)) }
            }
        }

        // ── Confirmation bottom sheet (shown on success) ──────────────────
        AnimatedVisibility(
            visible = walkInState is UiState.Success,
            enter = slideInVertically(initialOffsetY = { it }) + fadeIn(),
            exit  = slideOutVertically(targetOffsetY = { it }) + fadeOut()
        ) {
            if (walkInState is UiState.Success) {
                val order = (walkInState as UiState.Success<WalkInResponse>).data.data
                WalkInConfirmationCard(
                    order    = order,
                    payState = payState,
                    onMarkPaid = { viewModel.markWalkInPaid(order.orderId) },
                    onDone = {
                        viewModel.resetWalkInState()
                        viewModel.resetPayState()
                        customerName = ""
                        tableNumber  = ""
                        onBack()
                    }
                )
            }
        }
    }
}

@Composable
fun SmallCounterButton(text: String, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .size(28.dp)
            .clip(RoundedCornerShape(6.dp))
            .background(BorderColor),
        contentAlignment = Alignment.Center
    ) {
        IconButton(onClick = onClick, modifier = Modifier.size(28.dp)) {
            Text(text, fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextDark)
        }
    }
}
