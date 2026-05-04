import { ApiProperty } from '@nestjs/swagger';

export class PaginatedResponseDto<T> {
  @ApiProperty({ isArray: true })
  data: T[];

  @ApiProperty({ example: 150 }) total:      number;
  @ApiProperty({ example: 1   }) page:       number;
  @ApiProperty({ example: 20  }) pageSize:   number;
  @ApiProperty({ example: 8   }) totalPages: number;

  static of<T>(data: T[], total: number, page: number, pageSize: number): PaginatedResponseDto<T> {
    const dto        = new PaginatedResponseDto<T>();
    dto.data         = data;
    dto.total        = total;
    dto.page         = page;
    dto.pageSize     = pageSize;
    dto.totalPages   = Math.ceil(total / pageSize);
    return dto;
  }
}
