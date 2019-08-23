import { ApiModelProperty } from '@nestjs/swagger';
import {Category } from "../entities/category.entity";

export class DocumentDto {
  @ApiModelProperty()
  title: string;
  @ApiModelProperty({required: false})
  parentId: number;
  @ApiModelProperty()
  info: string;
  @ApiModelProperty()
  categoryId: number;
  @ApiModelProperty()
  active: boolean;
  @ApiModelProperty()
  visibility: boolean;
  @ApiModelProperty({required: false})
  consultant_link: string;
  @ApiModelProperty()
  renew: boolean;
}

export class UpdateDocumentDto {
  @ApiModelProperty({required: true})
  id: number;
  @ApiModelProperty({required: false})
  title: string;
  @ApiModelProperty({required: false})
  parentId: number;
  @ApiModelProperty({required: false})
  info: string;
  @ApiModelProperty({required: false})
  categoryId: number;
  @ApiModelProperty({required: false})
  active: boolean;
  @ApiModelProperty({required: false})
  visibility: boolean;
  @ApiModelProperty({required: false})
  renew: boolean;
}

export class IndexingDocumentDto {
  id: number;
  title: string;
  info: string;
  text: string;
  active: boolean;
  link: string;
  consultant_link: string;
  renew: boolean;
  ownerId: number;
  parentId: number;
  categoryId: number;
  updatedAt: Date;
  visibility: boolean;
  category: Category;
  createdAt: Date;
}

export class IndexedDocumentDto {
  id: number;
  title: string;
  info: string;
  text: string;
  category: string;
  active: boolean;
  link: string;
  consultant_link: string;
  renew: boolean;
  ownerId: number;
  parentId: number;
  categoryId: number;
  visibility: boolean;
  createdAt: string;
  updatedAt: string;
}

export class FormattedDocumentDto {
  id: number;
  link: string;
  parentId: number;
  level: number;
  formatted: CheerioStatic;
  resultedLink: string;
}

