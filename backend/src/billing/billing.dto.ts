import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CheckoutDto {
    @IsIn(['STARTER', 'GROWTH', 'AGENCY'])
    plan!: 'STARTER' | 'GROWTH' | 'AGENCY';
}

export class VerifyPaymentDto {
    @IsString() @IsNotEmpty() @MaxLength(100) orderId!: string;
    @IsString() @IsNotEmpty() @MaxLength(100) paymentId!: string;
    @IsString() @IsNotEmpty() @MaxLength(200) signature!: string;

    // Accepted so the existing checkout page keeps working, but ignored: the
    // plan is read from the Razorpay order, never trusted from the browser.
    @IsOptional() @IsString() plan?: string;
}
