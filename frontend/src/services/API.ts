import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
// const devices = useSelector((state: RootState) => state.device.devices);

export const ApiSlice = createApi({
  reducerPath: 'ApiSlice',
  baseQuery: fetchBaseQuery({ 
    baseUrl: 'http://localhost:5020/',
    prepareHeaders: (headers) => {
      const token = localStorage.getItem('token');
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['Devices', 'Users', 'Channels'],
  endpoints: (builder) => ({
    getUsers: builder.query({
      query: () => `api/users`,
    }),
    addUser: builder.mutation({
      query: (user) => ({
        url: 'api/users',
        method: 'post',
        body: user
    }),
    }),
    addDevice: builder.mutation({
      query: device => ({
        url: 'api/devices',
        method: 'post',
        body: device,
      }),
      invalidatesTags: ['Devices'],
    }),
    getDevices: builder.query({
      query: () => `api/devices`,
      providesTags: ['Devices'],
    }),
    getChannels: builder.query({
      query: ({deviceId}) => `api/channels/${deviceId}`,
      providesTags: ['Channels'],
    }),
    saveChannels: builder.mutation({
      query: (channelsList) => {
        console.log('Sending channels:', JSON.stringify(channelsList));

        return {
          url: 'api/channels',
          method: 'POST',
          body: channelsList,
        };
      },
      invalidatesTags: ['Channels'],
    }),
  }),
});

export const { 
  useGetUsersQuery, 
  useAddUserMutation,
  useSaveChannelsMutation,
  useGetDevicesQuery,
  useAddDeviceMutation,
  useGetChannelsQuery
} = ApiSlice;