import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Upload')
@Controller({
  path: 'upload',
  version: '1',
})
export class UploadController {
  constructor() {}
}
