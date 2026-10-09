import { IsInt, IsNotEmpty, IsString, MaxLength, Min } from 'class-validator';

export class CreateListDto {
    @IsString() @IsNotEmpty() @MaxLength(100)
    name!: string;
}

export class AddLeadToListDto {
    @IsInt() @Min(1)
    leadId!: number;
}
