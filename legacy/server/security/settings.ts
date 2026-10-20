// Explicit settings DTOs: secrets are write-only; masked metadata cannot overwrite stored credentials.
import { z } from 'zod';
import type { StoreSettings } from '../../shared/types';
const text = z.string().max(500);
const secret = z.string().min(1).max(512).refine(v => !v.includes('•') && !/^[*\s]+$/.test(v), 'Send a new value, not a mask.');
const replacement = z.object({ newValue: secret }).strict();
const gateway = z.object({
  enabled: z.boolean().optional(), sandbox: z.boolean().optional(), title: text.optional(),
  merchantId: replacement.optional(), pin: replacement.optional(), terminalId: replacement.optional(),
  apiKey: replacement.optional(), password: replacement.optional(), secret: replacement.optional(),
}).strict();
const sms = z.object({
  enabled: z.boolean().optional(), sender: text.optional(),
  username: replacement.optional(), apiKey: replacement.optional(), password: replacement.optional(),
}).strict();
const amount = z.number().finite().nonnegative().max(Number.MAX_SAFE_INTEGER);
export const settingsInput = z.object({
  storeName: text.optional(), storeLegalName: text.optional(), legalName: text.optional(), tagline: text.optional(),
  phone: text.optional(), email: z.email().optional(), supportEmail: z.email().optional(), address: text.optional(),
  economicCode: text.optional(), nationalId: text.optional(), registrationNumber: text.optional(), postalCode: text.optional(),
  freeShippingThreshold: amount.optional(), standardShippingFee: amount.optional(), expressShippingFee: amount.optional(),
  vatPercent: z.number().min(0).max(100).optional(), vatPercentage: z.number().min(0).max(100).optional(),
  currency: z.enum(['IRT', 'IRR']).optional(), maintenanceMode: z.boolean().optional(),
  smsActiveProvider: text.optional(), activeGateway: text.optional(), defaultPaymentGateway: text.optional(),
  activePaymentGateways: z.array(text).max(20).optional(), smsSenderNumber: text.optional(),
  allowGuestCheckout: z.boolean().optional(), requireNationalCodeForTaxInvoice: z.boolean().optional(),
  enableCod: z.boolean().optional(), enableWallet: z.boolean().optional(),
  shaparakTerminalId: replacement.optional(), shaparakMerchantId: replacement.optional(), kavenegarApiKey: replacement.optional(),
  gateways: z.object({ zarinpal: gateway.optional(), zibal: gateway.optional(), aghaye_pardakht: gateway.optional(), sep_mock: gateway.optional(), cod: gateway.optional(), wallet: gateway.optional() }).strict().optional(),
  sms: z.object({ melipayamak: sms.optional(), farazsms: sms.optional(), kavenegar: sms.optional() }).strict().optional(),
}).strict();
const secretKeys = new Set(['merchantId', 'pin', 'terminalId', 'apiKey', 'password', 'secret', 'username', 'shaparakTerminalId', 'shaparakMerchantId', 'kavenegarApiKey']);
function descriptor(value: unknown) {
  const isSet = typeof value === 'string' && value.length > 0 && !/^[•*]+$/.test(value);
  return { masked: isSet ? '••••••••' : '', isSet };
}
// Pick only known keys, including legacy values. Unknown persisted fields never leave the server.
export function safeSettings(settings: StoreSettings): any {
  function project(schema: any, input: any): any {
    const shape = schema.shape;
    const output: any = {};
    for (const key of Object.keys(shape)) {
      const value = input?.[key];
      if (secretKeys.has(key)) { output[key] = descriptor(value); continue; }
      if (key === 'gateways' || key === 'sms') {
        output[key] = {};
        const providers = key === 'gateways' ? ['zarinpal','zibal','aghaye_pardakht','sep_mock','cod','wallet'] : ['melipayamak','farazsms','kavenegar'];
        for (const provider of providers) if (value?.[provider]) output[key][provider] = project(key === 'gateways' ? gateway : sms, value[provider]);
      } else if (value !== undefined) {
        const valid = shape[key].safeParse(value);
        if (valid.success) output[key] = valid.data;
      }
    }
    return output;
  }
  return project(settingsInput, settings);
}
export function mergeSettings(current: any, patch: any): StoreSettings {
  const result = { ...current };
  for (const [key, value] of Object.entries(patch)) {
    if (secretKeys.has(key)) result[key] = (value as any).newValue;
    else if (key === 'gateways' || key === 'sms') {
      result[key] = { ...current[key] };
      for (const [provider, fields] of Object.entries(value as object)) result[key][provider] = mergeSettings(current[key]?.[provider] || {}, fields);
    } else result[key] = value;
  }
  return result;
}
