import { ValidationError } from 'class-validator';
import { BadRequestException } from '@nestjs/common';

const CAMPO_PT: Record<string, string> = {
  alunoId:                 'aluno',
  categoriaId:             'categoria',
  subcategoriaId:          'subcategoria',
  registradorId:           'registrador',
  severidade:              'severidade',
  dataIncidente:           'data do incidente',
  local:                   'local',
  descricao:               'descrição',
  status:                  'status',
  tipoDecisao:             'tipo de decisão',
  justificativa:           'justificativa',
  severidadeNova:          'nova severidade',
  aprovacaoRetroativaDiretor: 'aprovação retroativa',
  nome:                    'nome',
  email:                   'e-mail',
  telefone:                'telefone',
  parentesco:              'parentesco',
  matricula:               'matrícula',
  dataNascimento:          'data de nascimento',
  campus:                  'campus',
  curso:                   'curso',
  turma:                   'turma',
  segmento:                'segmento',
  perfil:                  'perfil',
  token:                   'token',
  page:                    'página',
  pageSize:                'itens por página',
};

const CONSTRAINT_PT: Record<string, string> = {
  isNotEmpty:         'não pode estar vazio',
  isString:           'deve ser um texto',
  isInt:              'deve ser um número inteiro',
  isNumber:           'deve ser um número',
  isBoolean:          'deve ser verdadeiro ou falso',
  isEnum:             'valor inválido para este campo',
  isUUID:             'deve ser um identificador UUID válido',
  isEmail:            'deve ser um e-mail válido',
  isDateString:       'deve ser uma data válida no formato AAAA-MM-DD',
  isArray:            'deve ser uma lista',
  isUrl:              'deve ser uma URL válida',
  isPositive:         'deve ser um número positivo',
  min:                'valor abaixo do mínimo permitido',
  max:                'valor acima do máximo permitido',
  minLength:          'texto muito curto',
  maxLength:          'texto muito longo',
  arrayMinSize:       'lista deve ter pelo menos um item',
  arrayMaxSize:       'lista excede o número máximo de itens',
  isOptional:         '',
  whitelistValidation:'campo não permitido',
};

function traduzirCampo(prop: string): string {
  return CAMPO_PT[prop] ?? prop.replace(/([A-Z])/g, ' $1').toLowerCase().trim();
}

function traduzirConstraints(error: ValidationError): string[] {
  if (error.children?.length) {
    return error.children.flatMap(traduzirConstraints);
  }
  return Object.keys(error.constraints ?? {}).map(key => {
    const msg = CONSTRAINT_PT[key];
    if (msg === undefined) return error.constraints![key]; // fallback inglês
    if (msg === '') return '';                              // isOptional — ignorar
    return `${traduzirCampo(error.property)}: ${msg}`;
  }).filter(Boolean);
}

export function validationExceptionFactory(errors: ValidationError[]): BadRequestException {
  const messages = errors.flatMap(traduzirConstraints);
  return new BadRequestException(messages.length ? messages : ['Dados inválidos']);
}
