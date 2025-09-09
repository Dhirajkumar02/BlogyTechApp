import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
const INITIAL_STATE = {
    loading: false,
    error: null,
    success: false,
    users: [],
    user: null,
    isUpdated: false,
    isDeleted: false,
    isEmailSent: false,
    isPasswordReset: false,
    profile: {},
    userAuth: {
        error: null,
        userInfo: {},
    },
};

//Login Action
export const loginAction = createAsyncThunk(
    "users/login",
    async (payload, { rejectWithValue, getState, dispatch }) => {
        //make request
        try {
            const response = await axios.post(
                "http://localhost:3000/api/v1/users/login",
                payload
            );
            return response;
        } catch (error) {
            return rejectWithValue(error?.response?.data);
        }
    }
);
const usersSlice = createSlice({
    name: "users",
    initialState: INITIAL_STATE,
    extraReducers: (builder) => {
        //login
        builder.addCase(loginAction.pending, (state, action) => {
            state.loading = true;
        });
        builder.addCase(loginAction.fulfilled, (state, action) => {
            state.loading = false;
            state.success = true;
            state.error = null;
            state.userAuth.userInfo = action.payload;
        });
        builder.addCase(loginAction.rejected, (state, action) => {
            state.loading = false;
            state.success = true;
            state.error = action.payload;
        });
    },
});
const usersReducer = usersSlice.reducer;
export default usersReducer;
