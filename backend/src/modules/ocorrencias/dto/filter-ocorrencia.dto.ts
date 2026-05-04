import { ApiPropertyOptional }   from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginatedFilterDto }    from '../../../common/dto/paginated-filter.dto';
import { StatusOcorrencia }      from '../../../common/enums/status-ocorrencia.enum';

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
}
