package com.tablemint.captain.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tablemint.captain.ui.theme.*
import com.tablemint.captain.viewmodel.CaptainViewModel

@Composable
fun HomeScreen(
    viewModel: CaptainViewModel,
    onOnlineCustomer: () -> Unit,
    onOfflineCustomer: () -> Unit,
    onLogout: () -> Unit
) {
    Column(modifier = Modifier.fillMaxSize().background(BgMain)) {

        // Top bar
        Surface(color = BgCard, shadowElevation = 2.dp, modifier = Modifier.fillMaxWidth()) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 14.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("🍽️", fontSize = 20.sp)
                    Spacer(Modifier.width(8.dp))
                    Column {
                        Row {
                            Text("Table", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextDark)
                            Text("Mint", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Amber)
                        }
                        Text(viewModel.restaurantName, fontSize = 11.sp, color = TextMuted)
                    }
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(36.dp)
                            .clip(CircleShape)
                            .background(AmberLight)
                            .border(1.5.dp, Amber.copy(alpha = 0.3f), CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            viewModel.captainName.firstOrNull()?.uppercase() ?: "C",
                            fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Amber
                        )
                    }
                    Spacer(Modifier.width(10.dp))
                    IconButton(onClick = onLogout) {
                        Icon(Icons.Default.ExitToApp, contentDescription = "Logout", tint = TextMuted)
                    }
                }
            }
        }

        // Main content
        Column(
            modifier = Modifier.fillMaxSize().padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Text(
                "Good to go, ${viewModel.captainName.split(" ").firstOrNull() ?: "Captain"}!",
                fontSize = 24.sp, fontWeight = FontWeight.Bold, color = TextDark,
                textAlign = TextAlign.Center
            )
            Text(
                "Select the customer type to proceed",
                fontSize = 14.sp, color = TextMuted, textAlign = TextAlign.Center,
                modifier = Modifier.padding(top = 6.dp, bottom = 40.dp)
            )

            CustomerTypeCard(
                icon = Icons.Default.Person,
                title = "Online Customer",
                subtitle = "Has a TableMint account",
                description = "Look up by 9-digit Customer ID → view reservation → add items to pre-order",
                color = Amber, bgColor = AmberLight,
                onClick = { viewModel.clearCart(); viewModel.resetLookup(); onOnlineCustomer() }
            )
            Spacer(Modifier.height(20.dp))
            CustomerTypeCard(
                icon = Icons.Default.PersonOff,
                title = "Offline / Walk-in Customer",
                subtitle = "No TableMint account",
                description = "Add food items to their order and send the bill directly to the admin panel",
                color = GreenColor, bgColor = GreenLight,
                onClick = { viewModel.clearCart(); viewModel.resetOfflineState(); onOfflineCustomer() }
            )
        }
    }
}

@Composable
fun CustomerTypeCard(
    icon: ImageVector,
    title: String,
    subtitle: String,
    description: String,
    color: androidx.compose.ui.graphics.Color,
    bgColor: androidx.compose.ui.graphics.Color,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth().clickable { onClick() },
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = BgCard),
        elevation = CardDefaults.cardElevation(4.dp),
        border = BorderStroke(1.5.dp, color.copy(alpha = 0.3f))
    ) {
        Row(modifier = Modifier.padding(22.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier.size(60.dp).clip(RoundedCornerShape(14.dp)).background(bgColor),
                contentAlignment = Alignment.Center
            ) {
                Icon(icon, contentDescription = null, tint = color, modifier = Modifier.size(30.dp))
            }
            Spacer(Modifier.width(18.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(title, fontSize = 17.sp, fontWeight = FontWeight.Bold, color = TextDark)
                Text(subtitle, fontSize = 12.sp, color = color, fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.padding(vertical = 3.dp))
                Text(description, fontSize = 13.sp, color = TextMid, lineHeight = 18.sp)
            }
            Spacer(Modifier.width(10.dp))
            Icon(Icons.Default.ArrowForwardIos, contentDescription = null,
                tint = color.copy(alpha = 0.6f), modifier = Modifier.size(18.dp))
        }
    }
}