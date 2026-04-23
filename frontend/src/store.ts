import { configureStore } from "@reduxjs/toolkit";
import { ApiSlice } from "./services/API";
import channelReducer from './services/channelSlice';
import themeReducer from './services/themeSlice';
import userReducer from "./services/userSlice";
import deviceReducer from "./services/deviceSlice"

export const store = configureStore({
    reducer: {
        [ApiSlice.reducerPath]: ApiSlice.reducer,
        channel: channelReducer,
        user: userReducer,
        device: deviceReducer,
        theme: themeReducer,
    },
    middleware: (getDefaultMiddleware) => {
        return getDefaultMiddleware().concat(ApiSlice.middleware);
    }
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch;