import {
  Controller, Get, Post, Patch, Delete, Body, Param,
  Query, HttpCode, HttpStatus, ParseUUIDPipe, ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery,
} from '@nestjs/swagger';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { StudentResponseDto } from './dto/student-response.dto';
import { Roles, Role } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('Alunos')
@ApiBearerAuth()
@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.COORDINATOR, Role.SECRETARY)
  @ApiOperation({ summary: 'Cadastrar aluno — vincula responsável automaticamente para menores (RN-02)' })
  @ApiResponse({ status: 201, type: StudentResponseDto })
  @ApiResponse({ status: 400, description: 'Responsável obrigatório para menor de 18 anos' })
  @ApiResponse({ status: 409, description: 'Matrícula já cadastrada' })
  async create(
    @Body() dto: CreateStudentDto,
    @CurrentUser() currentUser: User,
  ): Promise<StudentResponseDto> {
    const student = await this.studentsService.create(dto, currentUser.tenantId);
    return StudentResponseDto.from(student);
  }

  @Get()
  @Roles(Role.ADMIN, Role.COORDINATOR, Role.TEACHER, Role.SECRETARY)
  @ApiOperation({ summary: 'Listar alunos com paginação' })
  @ApiQuery({ name: 'page',  required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @CurrentUser() currentUser: User,
    @Query('page',  new DefaultValuePipe(1),  ParseIntPipe) page:  number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    const { data, total } = await this.studentsService.findAll(
      currentUser.tenantId, { page, limit },
    );
    return { data: data.map(StudentResponseDto.from), total, page, limit };
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.COORDINATOR, Role.TEACHER, Role.SECRETARY)
  @ApiOperation({ summary: 'Buscar aluno por ID' })
  @ApiResponse({ status: 200, type: StudentResponseDto })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: User,
  ): Promise<StudentResponseDto> {
    const student = await this.studentsService.findOne(id, currentUser.tenantId);
    return StudentResponseDto.from(student);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.COORDINATOR)
  @ApiOperation({ summary: 'Atualizar dados do aluno' })
  @ApiResponse({ status: 200, type: StudentResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStudentDto,
    @CurrentUser() currentUser: User,
  ): Promise<StudentResponseDto> {
    const student = await this.studentsService.update(id, dto, currentUser.tenantId);
    return StudentResponseDto.from(student);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover aluno — soft delete (Admin)' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: User,
  ): Promise<void> {
    await this.studentsService.remove(id, currentUser.tenantId);
  }
}
