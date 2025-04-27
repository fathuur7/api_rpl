import midtransClient from 'midtrans-client';
import dotenv from 'dotenv';

dotenv.config();

export const snap = new midtransClient.Snap({
  isProduction: false,
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY
});

export const core = new midtransClient.CoreApi({
  isProduction: false,
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY
});

export const getMidtransClientKey = () => process.env.MIDTRANS_CLIENT_KEY;

