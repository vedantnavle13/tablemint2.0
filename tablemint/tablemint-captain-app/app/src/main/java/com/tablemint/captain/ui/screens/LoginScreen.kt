package com.tablemint.captain.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tablemint.captain.ui.theme.*
import com.tablemint.captain.viewmodel.CaptainViewModel
import com.tablemint.captain.viewmodel.UiState

@Composable
fun LoginScreen(viewModel: CaptainViewModel, onLoginSuccess: () -> Unit) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var showPassword by remember { mutableStateOf(false) }
    val loginState by viewModel.loginState.collectAsState()

    // Navigate on success
    LaunchedEffect(loginState) {
        if (loginState is UiState.Success) {
            viewModel.resetLoginState()
            onLoginSuccess()
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BgMain)
            .padding(28.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        // Logo
        Text("🍽️", fontSize = 48.sp, textAlign = TextAlign.Center)
        Spacer(Modifier.height(8.dp))
        Row {
            Text("Table", fontSize = 28.sp, fontWeight = FontWeight.Bold, color = TextDark)
            Text("Mint", fontSize = 28.sp, fontWeight = FontWeight.Bold, color = Amber)
        }
        Text(
            "Captain Portal",
            fontSize = 13.sp,
            color = TextMuted,
            letterSpacing = 2.sp,
            modifier = Modifier.padding(top = 4.dp, bottom = 40.dp)
        )

        // Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = BgCard),
            elevation = CardDefaults.cardElevation(4.dp)
        ) {
            Column(modifier = Modifier.padding(24.dp)) {

                Text("Sign In", fontSize = 22.sp, fontWeight = FontWeight.Bold, color = TextDark)
                Text("Use your admin or captain credentials", fontSize = 13.sp, color = TextMuted,
                    modifier = Modifier.padding(top = 4.dp, bottom = 24.dp))

                // Error banner
                if (loginState is UiState.Error) {
                    Surface(
                        color = RedLight, shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp)
                    ) {
                        Text(
                            "⚠️ ${(loginState as UiState.Error).message}",
                            fontSize = 13.sp, color = RedColor,
                            modifier = Modifier.padding(12.dp)
                        )
                    }
                }

                // Email
                Text("EMAIL", fontSize = 11.sp, fontWeight = FontWeight.Bold,
                    color = TextMuted, letterSpacing = 1.sp)
                Spacer(Modifier.height(6.dp))
                OutlinedTextField(
                    value = email,
                    onValueChange = { email = it },
                    placeholder = { Text("admin@restaurant.com", color = TextMuted) },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = Amber,
                        unfocusedBorderColor = BorderColor,
                    )
                )
                Spacer(Modifier.height(16.dp))

                // Password
                Text("PASSWORD", fontSize = 11.sp, fontWeight = FontWeight.Bold,
                    color = TextMuted, letterSpacing = 1.sp)
                Spacer(Modifier.height(6.dp))
                OutlinedTextField(
                    value = password,
                    onValueChange = { password = it },
                    placeholder = { Text("••••••••", color = TextMuted) },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp),
                    visualTransformation = if (showPassword) VisualTransformation.None else PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                    singleLine = true,
                    trailingIcon = {
                        TextButton(onClick = { showPassword = !showPassword }) {
                            Text(if (showPassword) "Hide" else "Show", color = Amber, fontSize = 12.sp)
                        }
                    },
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = Amber,
                        unfocusedBorderColor = BorderColor,
                    )
                )
                Spacer(Modifier.height(24.dp))

                // Login button
                Button(
                    onClick = { viewModel.login(email.trim(), password) },
                    modifier = Modifier.fillMaxWidth().height(52.dp),
                    shape = RoundedCornerShape(12.dp),
                    enabled = email.isNotBlank() && password.isNotBlank() && loginState !is UiState.Loading,
                    colors = ButtonDefaults.buttonColors(containerColor = Amber)
                ) {
                    if (loginState is UiState.Loading) {
                        CircularProgressIndicator(color = BgCard, modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                    } else {
                        Text("Sign In →", fontSize = 16.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}
