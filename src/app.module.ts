import { Module, HttpModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { DocumentModule } from './document/document.module';
import { BookmarkModule } from './bookmarks/bookmark.module';
import { SearchModule } from './search/search.module';

@Module({
  imports: [
    HttpModule,
    DatabaseModule,
    UserModule,
    AuthModule,
    DocumentModule,
    BookmarkModule,
    SearchModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
