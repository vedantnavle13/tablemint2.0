package com.tablemint.captain.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tablemint.captain.data.models.MenuItem
import com.tablemint.captain.ui.theme.*

@Composable
fun TopBar(title: String, onBack: () -> Unit) {
    Surface(color = BgCard, shadowElevation = 2.dp, modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = onBack) {
                Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = TextDark)
            }
            Text(title, fontSize = 18.sp, fontWeight = FontWeight.Bold, color = TextDark)
        }
    }
}

@Composable
fun MenuItemRow(
    item: MenuItem,
    quantity: Int,
    onAdd: () -> Unit,
    onRemove: () -> Unit,
    accentColor: Color = Amber
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = BgCard),
        elevation = CardDefaults.cardElevation(1.dp)
    ) {
        Row(modifier = Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            // Veg/NonVeg dot indicator
            Box(
                modifier = Modifier
                    .size(14.dp)
                    .clip(RoundedCornerShape(2.dp))
                    .border(1.dp, if (item.isVeg) GreenColor else RedColor, RoundedCornerShape(2.dp)),
                contentAlignment = Alignment.Center
            ) {
                Box(
                    modifier = Modifier.size(7.dp).clip(CircleShape)
                        .background(if (item.isVeg) GreenColor else RedColor)
                )
            }
            Spacer(Modifier.width(10.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(item.name, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = TextDark)
                if (!item.description.isNullOrBlank()) {
                    Text(item.description, fontSize = 11.sp, color = TextMuted,
                        maxLines = 1, modifier = Modifier.padding(top = 2.dp))
                }
                Text("₹${item.price.toInt()}", fontSize = 14.sp,
                    fontWeight = FontWeight.Bold, color = accentColor,
                    modifier = Modifier.padding(top = 4.dp))
            }

            Spacer(Modifier.width(10.dp))

            if (quantity == 0) {
                OutlinedButton(
                    onClick = onAdd,
                    shape = RoundedCornerShape(8.dp),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = accentColor),
                    border = BorderStroke(1.dp, accentColor),
                    modifier = Modifier.height(36.dp),
                    contentPadding = PaddingValues(horizontal = 16.dp)
                ) {
                    Text("ADD", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            } else {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.clip(RoundedCornerShape(8.dp)).background(accentColor).padding(horizontal = 4.dp)
                ) {
                    IconButton(onClick = onRemove, modifier = Modifier.size(32.dp)) {
                        Text("−", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = BgCard)
                    }
                    Text("$quantity", fontSize = 14.sp, fontWeight = FontWeight.Bold,
                        color = BgCard, modifier = Modifier.padding(horizontal = 8.dp))
                    IconButton(onClick = onAdd, modifier = Modifier.size(32.dp)) {
                        Text("+", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = BgCard)
                    }
                }
            }
        }
    }
}

@Composable
fun InfoChip(text: String) {
    Surface(
        color = BgSoft, shape = RoundedCornerShape(20.dp),
        border = BorderStroke(1.dp, BorderColor)
    ) {
        Text(text, fontSize = 12.sp, color = TextMid, fontWeight = FontWeight.Medium,
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp))
    }
}

@Composable
fun ErrorBanner(message: String) {
    Surface(color = RedLight, shape = RoundedCornerShape(10.dp), modifier = Modifier.fillMaxWidth()) {
        Text("⚠️ $message", fontSize = 13.sp, color = RedColor, modifier = Modifier.padding(14.dp))
    }
}