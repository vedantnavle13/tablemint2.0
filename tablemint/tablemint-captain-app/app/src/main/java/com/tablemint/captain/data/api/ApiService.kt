package com.tablemint.captain.data.api

import com.tablemint.captain.data.models.*
import retrofit2.Response
import retrofit2.http.*

interface ApiService {

    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): Response<LoginResponse>

    @GET("captain/restaurant/menu")
    suspend fun getMenu(@Header("Authorization") token: String): Response<MenuResponse>

    @GET("captain/lookup/{customerId}")
    suspend fun lookupCustomer(
        @Header("Authorization") token: String,
        @Path("customerId") customerId: String
    ): Response<CustomerLookupResponse>

    @POST("captain/reservations/{id}/add-items")
    suspend fun addItemsToReservation(
        @Header("Authorization") token: String,
        @Path("id") reservationId: String,
        @Body request: AddItemsRequest
    ): Response<AddItemsResponse>

    @POST("captain/offline-order")
    suspend fun createOfflineOrder(
        @Header("Authorization") token: String,
        @Body request: OfflineOrderRequest
    ): Response<OfflineOrderResponse>
}
