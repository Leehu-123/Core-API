import { PartialType } from '@nestjs/swagger';
import { CreateStocktakeDto } from './create-stocktake.dto';

export class UpdateStocktakeDto extends PartialType(CreateStocktakeDto) {}
