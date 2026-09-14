import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { ISslCommerzPayload } from './ssl-commerz.interface';

@Injectable()
export class SslCommerzService {
  constructor(private readonly config: ConfigService) {}

  // amount, transactionId, name, email, phoneNumber, address

  async initPayment(
    payload: ISslCommerzPayload,
  ): Promise<{ GatewayPageURL: string }> {
    const data = {
      store_id: this.config.get('SSL_STORE_ID'),
      store_passwd: this.config.get('SSL_STORE_PASS'),
      total_amount: payload.amount,
      currency: 'BDT',
      tran_id: payload.transactionId,

      // SSLCommerz calls these URLs directly (server-to-server for IPN, redirect for others)
      success_url: `${this.config.get('SSL_SUCCESS_BACKEND_URL')}?transactionId=${payload.transactionId}&amount=${payload.amount}&status=success`,
      fail_url: `${this.config.get('SSL_FAIL_BACKEND_URL')}?transactionId=${payload.transactionId}&amount=${payload.amount}&status=fail`,
      cancel_url: `${this.config.get('SSL_CANCEL_BACKEND_URL')}?transactionId=${payload.transactionId}&amount=${payload.amount}&status=cancel`,
      ipn_url: this.config.get('SSL_IPN_URL'),

      shipping_method: 'N/A',
      product_name: 'Tour',
      product_category: 'Service',
      product_profile: 'general',

      cus_name: payload.name,
      cus_email: payload.email,
      cus_add1: payload.address,
      cus_add2: 'N/A',
      cus_city: 'Dhaka',
      cus_state: 'Dhaka',
      cus_postcode: '1000',
      cus_country: 'Bangladesh',
      cus_phone: payload.phoneNumber,
      cus_fax: 'N/A',

      ship_name: 'N/A',
      ship_add1: 'N/A',
      ship_add2: 'N/A',
      ship_city: 'N/A',
      ship_state: 'N/A',
      ship_postcode: 1000,
      ship_country: 'N/A',
    };

    try {
      const response = await axios.post(
        this.config.get<string>('SSL_PAYMENT_API')!,
        new URLSearchParams(data as any).toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      );

      if (!response.data?.GatewayPageURL) {
        throw new InternalServerErrorException(
          'SSLCommerz did not return a payment URL',
        );
      }

      return response.data;
    } catch (error: any) {
      throw new InternalServerErrorException(
        `SSLCommerz init failed: ${error.message}`,
      );
    }
  }

  async validatePayment(valId: string): Promise<any> {
    try {
      const response = await axios.get(
        this.config.get<string>('SSL_VALIDATION_API')!,
        {
          params: {
            val_id: valId,
            store_id: this.config.get('SSL_STORE_ID'),
            store_passwd: this.config.get('SSL_STORE_PASS'),
          },
        },
      );
      return response.data;
    } catch (error: any) {
      throw new InternalServerErrorException(
        `SSLCommerz validation failed: ${error.message}`,
      );
    }
  }
}
