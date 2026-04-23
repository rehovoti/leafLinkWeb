import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
type User = { name: string; id: number };

interface UserState {
  user: User
}
const initialState: UserState = {
  user: { name: '',
          id: 0 }
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<{ id: number; name: string }>) {
      state.user.name = action.payload.name;
      state.user.id = action.payload.id;
      console.log(state)
    },
  },
});

export const {
  setUser
} = userSlice.actions;

export default userSlice.reducer;