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

    // ── Walk-in orders (new clean flow) ──────────────────────────────────────

    /** Create a new walk-in order. Returns walkInId + transactionId for customer reference. */
    @POST("captain/walk-in")
    suspend fun createWalkIn(
        @Header("Authorization") token: String,
        @Body request: WalkInRequest
    ): Response<WalkInResponse>

    /** Mark a walk-in order as paid (captain or admin). */
    @PATCH("captain/walk-in/{id}/pay")
    suspend fun markWalkInPaid(
        @Header("Authorization") token: String,
        @Path("id") orderId: String
    ): Response<MarkPaidResponse>
}
