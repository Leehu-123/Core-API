import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtPayload, Permissions } from '../../common/decorators';
import { PermissionsGuard } from '../../common/guards';
import { QuotesService } from './quotes.service';
import { CreateQuoteDto, QueryQuoteDto, UpdateQuoteDto } from './dto';

@ApiTags('Quotes')
@Controller('quotes')
@ApiBearerAuth()
@UseGuards(PermissionsGuard)
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Get()
  @Permissions('quotes.read')
  findAll(@CurrentUser() user: JwtPayload, @Query() query: QueryQuoteDto) {
    return this.quotesService.findAll(user.companyId, query);
  }

  @Get(':id')
  @Permissions('quotes.read')
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.quotesService.findOne(id, user.companyId);
  }

  @Post()
  @Permissions('quotes.create')
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateQuoteDto) {
    return this.quotesService.create(user.companyId, user.sub, dto);
  }

  @Put(':id')
  @Permissions('quotes.update')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateQuoteDto,
  ) {
    return this.quotesService.update(id, user.companyId, user.sub, dto);
  }

  @Post(':id/send')
  @Permissions('quotes.update')
  send(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.quotesService.send(id, user.companyId, user.sub);
  }

  @Delete(':id')
  @Permissions('quotes.delete')
  softRemove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.quotesService.softRemove(id, user.companyId);
  }

  @Delete(':id/hard')
  @Permissions('quotes.delete')
  hardRemove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.quotesService.hardRemove(id, user.companyId);
  }
}
