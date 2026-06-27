import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class AssignRoleDto {
  @ApiProperty({ description: 'User ID to assign/remove role' })
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ description: 'Role name to assign/remove' })
  @IsString()
  @IsNotEmpty()
  roleName: string;
}
