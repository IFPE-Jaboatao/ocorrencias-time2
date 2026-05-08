import { ApiPropertyOptional }                       from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsUUID }   from 'class-validator';
import { PaginatedFilterDto }                          from '../../../common/dto/paginated-filter.dto';
import { StatusOcorrencia }                            from '../../../common/enums/status-ocorrencia.enum';

export class FilterOcorrenciaDto extends PaginatedFilterDto {
  @ApiPropertyOptional({ enum: StatusOcorrencia })
  @IsOptional() @IsEnum(StatusOcorrencia)
  status?: StatusOcorrencia;

  @ApiPropertyOptional()
  @IsOptional() @IsUUID()
  alunoId?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 5 })
  @IsOptional()
  severidade?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsUUID()
  categoriaId?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsUUID()
  subcategoriaId?: string;

  @ApiPropertyOptional({ description: 'Data início (YYYY-MM-DD)' })
  @IsOptional() @IsDateString()
  dataInicio?: string;

  @ApiPropertyOptional({ description: 'Data fim (YYYY-MM-DD)' })
  @IsOptional() @IsDateString()
  dataFim?: string;
}
