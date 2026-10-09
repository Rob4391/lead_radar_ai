import { IsArray, IsIn, IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class CollectLeadsDto {
    @IsString() @IsNotEmpty() @MaxLength(80)
    city!: string;

    @IsString() @IsNotEmpty() @MaxLength(80)
    category!: string;
}

export class ScoreLeadsDto {
    @IsOptional() @IsString() @MaxLength(80)
    city?: string;

    @IsOptional() @IsString() @MaxLength(80)
    category?: string;
}

export class CreateLeadDto {
    @IsOptional() @IsString() @MaxLength(200) name?: string;
    @IsOptional() @IsString() @MaxLength(40) phone?: string;
    @IsOptional() @IsUrl({ require_protocol: true, protocols: ['http', 'https'] }) website?: string;
    @IsOptional() @IsArray() @IsString({ each: true }) emails?: string[];
    @IsOptional() @IsArray() @IsString({ each: true }) urls?: string[];
    @IsOptional() @IsArray() @IsString({ each: true }) titles?: string[];
    @IsOptional() @IsString() @MaxLength(80) city?: string;
    @IsOptional() @IsString() @MaxLength(80) category?: string;
}

export class UpdateStatusDto {
    @IsIn(['NEW', 'CONTACTED', 'REPLIED', 'WON', 'LOST'])
    status!: 'NEW' | 'CONTACTED' | 'REPLIED' | 'WON' | 'LOST';

    @IsOptional() @IsString() @MaxLength(5000)
    notes?: string;
}
