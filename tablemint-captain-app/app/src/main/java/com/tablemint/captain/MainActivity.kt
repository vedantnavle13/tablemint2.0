package com.tablemint.captain

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.runtime.*
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.tablemint.captain.ui.screens.*
import com.tablemint.captain.ui.theme.TableMintCaptainTheme
import com.tablemint.captain.viewmodel.CaptainViewModel

object Routes {
    const val LOGIN   = "login"
    const val HOME    = "home"
    const val ONLINE  = "online"
    const val OFFLINE = "offline"
}

class MainActivity : ComponentActivity() {

    private val viewModel: CaptainViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            TableMintCaptainTheme {
                CaptainApp(viewModel)
            }
        }
    }
}

@Composable
fun CaptainApp(viewModel: CaptainViewModel) {
    val nav = rememberNavController()

    NavHost(navController = nav, startDestination = Routes.LOGIN) {

        composable(Routes.LOGIN) {
            LoginScreen(
                viewModel = viewModel,
                onLoginSuccess = {
                    nav.navigate(Routes.HOME) {
                        popUpTo(Routes.LOGIN) { inclusive = true }
                    }
                }
            )
        }

        composable(Routes.HOME) {
            HomeScreen(
                viewModel = viewModel,
                onOnlineCustomer  = { nav.navigate(Routes.ONLINE) },
                onOfflineCustomer = { nav.navigate(Routes.OFFLINE) },
                onLogout = {
                    viewModel.logout()
                    nav.navigate(Routes.LOGIN) {
                        popUpTo(Routes.HOME) { inclusive = true }
                    }
                }
            )
        }

        composable(Routes.ONLINE) {
            OnlineCustomerScreen(
                viewModel = viewModel,
                onBack = { nav.popBackStack() }
            )
        }

        composable(Routes.OFFLINE) {
            OfflineCustomerScreen(
                viewModel = viewModel,
                onBack = { nav.popBackStack() }
            )
        }
    }
}
