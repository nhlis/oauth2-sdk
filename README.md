# oauth2-sdk

Client chạy trên trình duyệt cho OAuth2/OIDC của nhlis SSO: đăng nhập bằng **authorization code + PKCE** qua **popup** hoặc **redirect**, dành cho mọi dịch vụ đóng vai trò relying party.

- Public client (SPA), không dùng `client_secret`.
- Không có dependency khi chạy, viết bằng TypeScript, có sẵn type declarations.
- Phát hành dạng ESM và CJS.

> **Lưu ý:** gói này **không được publish lên npm**. Bạn chỉ cài trực tiếp từ GitHub bằng Bun, xem mục [Cài đặt](#cài-đặt).

## Tính năng

- **PKCE (S256)**, kèm `state` và `nonce` được sinh ngẫu nhiên cho mỗi lần đăng nhập.
- **Hai chế độ đăng nhập**: popup (`loginWithPopup`) hoặc chuyển hướng cả trang (`loginWithRedirect`), chọn qua `uxMode`.
- **Popup thân thiện với Safari**: popup được mở đồng bộ dưới dạng `about:blank` ngay trong user gesture, sau đó mới điều hướng tới URL đăng nhập, nên không bị chặn khi có `await` trước đó.
- **OIDC Discovery** tự động từ `${issuerUrl}/.well-known/openid-configuration`, chỉ gọi một lần cho mỗi client. Có thể truyền `endpoints` thủ công để bỏ qua bước này.
- **Kiểm tra claim của `id_token`**: `nonce`, `aud`, `iss`, `exp` (cho phép lệch đồng hồ 60 giây). Xem [Lưu ý bảo mật](#lưu-ý-bảo-mật).
- **Làm mới token** bằng refresh token, **lấy thông tin người dùng** (`userinfo`) và **thu hồi token** (`revoke`).
- **Lỗi có kiểu rõ ràng**: `IdpOAuth2ApiError`, `PopupBlockedError`, `PopupClosedByUserError`, `PopupTimeoutError`, `IdTokenValidationError`.
- **An toàn khi gặp phản hồi lỗi không phải JSON** (ví dụ trang lỗi HTML của gateway): SDK tự tạo lỗi tương ứng thay vì ném `SyntaxError`.

## Yêu cầu

- Chạy trên **trình duyệt** (SDK dùng `window`, `sessionStorage` và `crypto.subtle`), nên trang cần chạy trong secure context (HTTPS hoặc `localhost`).
- `redirectUri` phải nằm trong danh sách được phép của client đã đăng ký trên nhlis SSO, và nằm cùng origin với ứng dụng của bạn.

## Cài đặt

```bash
bun add github:nhlis/oauth2-sdk
```

Ghim theo tag hoặc commit để build ổn định hơn:

```bash
bun add github:nhlis/oauth2-sdk#v1.0.0
```

Cập nhật lên commit mới nhất:

```bash
bun update oauth2-sdk
```

## Bắt đầu nhanh

### 1. Tạo client

```ts
import { IdpOAuth2Client } from 'oauth2-sdk';

export const auth = new IdpOAuth2Client({
    clientId: 'your-client-id',
    issuerUrl: 'https://sso.example.com',
    redirectUri: 'https://myapp.example.com/oauth2/callback',
    scope: 'openid profile email',
});
```

### 2. Đăng nhập bằng popup (mặc định)

Gọi từ một sự kiện click của người dùng, nếu không trình duyệt sẽ chặn popup.

```ts
button.addEventListener('click', async () => {
    try {
        const tokens = await auth.login(); // tương đương loginWithPopup()
        const user = await auth.getUserInfo(tokens.access_token);
        console.log(user);
    } catch (error) {
        // xem mục "Xử lý lỗi"
    }
});
```

Trang tại `redirectUri` (ví dụ `/oauth2/callback`) cần chạy một trong hai cách sau để chuyển kết quả về cửa sổ gốc:

```ts
// Cách 1: trang callback tĩnh, chỉ cần một dòng
import { handleOAuth2PopupCallback } from 'oauth2-sdk/callback';

handleOAuth2PopupCallback();
```

```ts
// Cách 2: dùng chung đoạn code xử lý redirect (xem bên dưới).
// Khi chạy bên trong popup, handleRedirectCallback() chỉ chuyển code/state/error
// về cửa sổ gốc và trả về null.
await auth.handleRedirectCallback();
```

Hai cách có thể dùng cùng lúc, thứ tự nào cũng được.

### 3. Đăng nhập bằng redirect

```ts
const auth = new IdpOAuth2Client({
    // ...như trên
    uxMode: 'redirect',
});

// Chuyển cả trang tới trang đăng nhập. Promise này không bao giờ resolve vì trình duyệt rời trang.
await auth.login();
```

Khi trang `redirectUri` được tải, hoàn tất việc đổi code lấy token:

```ts
const tokens = await auth.handleRedirectCallback();
if (tokens) {
    // đăng nhập thành công
}
// tokens === null: đây chỉ là lần truy cập bình thường, không phải callback OAuth2
```

`handleRedirectCallback()` an toàn khi gọi vô điều kiện lúc tải trang. Nó cũng xóa `code`, `state`... khỏi URL để tải lại trang không gửi lại cùng một code.

## API

### `new IdpOAuth2Client(config)`

| Tùy chọn      | Kiểu                    | Mặc định  | Mô tả                                                             |
| ------------- | ----------------------- | --------- | ----------------------------------------------------------------- |
| `clientId`    | `string`                | bắt buộc  | `client_id` đã đăng ký với nhà cung cấp                           |
| `issuerUrl`   | `string`                | bắt buộc  | URL issuer, dùng để lấy discovery document                        |
| `redirectUri` | `string`                | bắt buộc  | Redirect URI đã được cho phép, trên origin của ứng dụng bạn       |
| `scope`       | `string`                | bắt buộc  | Các scope cách nhau bằng dấu cách, ví dụ `"openid profile email"` |
| `endpoints`   | `IIdpDiscoveryDocument` | không     | Bỏ qua discovery và dùng các endpoint này trực tiếp               |
| `uxMode`      | `"popup" \| "redirect"` | `"popup"` | Chế độ mà `login()` sử dụng                                       |
| `popupWidth`  | `number`                | `480`     | Chiều rộng popup                                                  |
| `popupHeight` | `number`                | `640`     | Chiều cao popup                                                   |
| `timeoutMs`   | `number`                | `300000`  | Thời gian chờ người dùng hoàn tất popup (5 phút)                  |

### Các phương thức

| Phương thức                        | Mô tả                                                                                                       |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `login(options?)`                  | Đăng nhập theo `uxMode`. Ở chế độ popup trả về `IIdpTokenResponse`, ở chế độ redirect không bao giờ resolve |
| `loginWithPopup(options?)`         | Đăng nhập bằng popup, resolve với token                                                                     |
| `loginWithRedirect(options?)`      | Chuyển cả trang tới trang đăng nhập                                                                         |
| `handleRedirectCallback()`         | Gọi tại `redirectUri`. Trả về token, hoặc `null` nếu URL không phải callback (hoặc đang ở trong popup)      |
| `refreshAccessToken(refreshToken)` | Đổi refresh token lấy token mới                                                                             |
| `getUserInfo(accessToken)`         | Gọi `userinfo_endpoint`                                                                                     |
| `revokeToken(token, hint?)`        | Thu hồi token. `hint` là `"access_token"` hoặc `"refresh_token"`                                            |

### `ILoginOptions`

| Tùy chọn     | Giá trị                                              | Mô tả                                                                                                               |
| ------------ | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `prompt`     | `"none" \| "login" \| "consent" \| "select_account"` | Tham số `prompt` chuẩn của OIDC. Mặc định không gửi                                                                 |
| `accessType` | `"online" \| "offline"`                              | `"offline"` yêu cầu IdP trả thêm `refresh_token`. Nếu bỏ qua, IdP dùng mặc định `online` và không trả refresh token |

Ví dụ lấy refresh token:

```ts
const tokens = await auth.login({ accessType: 'offline', prompt: 'consent' });
// tokens.refresh_token
```

### Các hàm tiện ích khác được export

- `fetchDiscoveryDocument(issuerUrl)`: lấy discovery document.
- `decodeIdTokenPayload(idToken)`: giải mã payload của `id_token` (không xác minh chữ ký).

### Kiểu dữ liệu được export

`IIdpOAuth2ClientConfig`, `IIdpTokenResponse`, `IIdpUserInfo`, `IIdpOAuth2Error`, `IIdpDiscoveryDocument`, `IIdTokenClaims`.

## Xử lý lỗi

```ts
import { IdpOAuth2ApiError, PopupBlockedError, PopupClosedByUserError, PopupTimeoutError, IdTokenValidationError } from 'oauth2-sdk';

try {
    await auth.login();
} catch (error) {
    if (error instanceof PopupBlockedError) {
        // Trình duyệt chặn popup: hãy gọi login() trực tiếp từ sự kiện click
    } else if (error instanceof PopupClosedByUserError) {
        // Người dùng đóng popup trước khi hoàn tất
    } else if (error instanceof PopupTimeoutError) {
        // Quá thời gian chờ (timeoutMs)
    } else if (error instanceof IdTokenValidationError) {
        // id_token không hợp lệ (nonce, audience, issuer hoặc đã hết hạn)
    } else if (error instanceof IdpOAuth2ApiError) {
        // Lỗi từ nhà cung cấp, xem error.errorBody.error và error.errorBody.error_description
    }
}
```

Một số mã `errorBody.error` do chính SDK tạo ra:

| Mã                  | Khi nào                                                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `invalid_state`     | `state` không khớp với phiên đăng nhập nào đang chờ (có thể là CSRF hoặc phiên đã hết hạn)                          |
| `invalid_request`   | URL callback có `code` nhưng thiếu `state`                                                                          |
| `invalid_response`  | Popup trả về nhưng không có authorization code                                                                      |
| `popup_opener_lost` | Cửa sổ popup không còn cửa sổ gốc để trả kết quả (bị đóng, tải lại, hoặc `Cross-Origin-Opener-Policy` cắt liên kết) |
| `http_<status>`     | Phản hồi lỗi từ nhà cung cấp không phải JSON, ví dụ `http_502`                                                      |

Lưu ý: `getUserInfo()` ném `TypeError` ngay trên client, trước khi gọi mạng, nếu giá trị truyền vào không phải access token dạng JWT (3 đoạn cách nhau bởi dấu chấm). Lỗi này thường do truyền nhầm cả object token hoặc `id_token`, hãy truyền `tokens.access_token`.

## Cách hoạt động

1. `login*()` sinh cặp PKCE, `state` và `nonce`, lưu `code_verifier` và `nonce` vào `sessionStorage` theo `state`, rồi chuyển người dùng tới `authorization_endpoint`.
2. Sau khi người dùng đồng ý, nhà cung cấp chuyển về `redirectUri` kèm `code` và `state`.
3. Ở chế độ popup, trang callback gửi kết quả về cửa sổ gốc bằng `postMessage` (giới hạn theo origin của `redirectUri`). Cửa sổ gốc kiểm tra `origin` và `state`, đóng popup rồi đổi code lấy token.
4. Ở chế độ redirect, `handleRedirectCallback()` tự lấy phiên đăng nhập đang chờ và đổi code lấy token.
5. Mỗi `state` chỉ dùng được một lần: phiên đang chờ bị xóa ngay khi được đọc.
6. Nếu có `id_token`, SDK kiểm tra các claim trước khi trả token về cho bạn.

Các state của popup có tiền tố `p.` để trang `redirectUri` phân biệt được "cửa sổ này chỉ chuyển tiếp kết quả" với "cửa sổ này tự hoàn tất việc đổi code".

## Lưu ý bảo mật

- **`id_token` chỉ được kiểm tra claim, chưa xác minh chữ ký.** SDK dựa vào việc `id_token` được nhận trực tiếp qua HTTPS từ `token_endpoint` (back-channel), không đi qua redirect của trình duyệt. Nếu mô hình đe dọa của bạn yêu cầu xác minh chữ ký (ví dụ theo profile FAPI), hãy xác minh ở phía server.
- **Token nằm trong bộ nhớ của ứng dụng.** SDK không tự lưu token. Việc lưu trữ (bộ nhớ, cookie, v.v.) là trách nhiệm của bạn.
- **Chỉ có `code_verifier` và `nonce` được lưu tạm** trong `sessionStorage`, và bị xóa sau khi dùng.

## Phát triển

```bash
git clone https://github.com/nhlis/oauth2-sdk.git
cd oauth2-sdk
bun install
```

| Lệnh                 | Mô tả                                            |
| -------------------- | ------------------------------------------------ |
| `bun run build`      | Build ra `dist/` bằng tsup (ESM + CJS + `.d.ts`) |
| `bun run dev`        | Build ở chế độ watch                             |
| `bun run typecheck`  | Kiểm tra kiểu bằng `tsc --noEmit`                |
| `bun run test`       | Chạy test bằng Vitest (môi trường jsdom)         |
| `bun run test:watch` | Chạy test ở chế độ watch                         |

> Dùng `bun run test` thay vì `bun test`, vì dự án dùng Vitest chứ không phải test runner của Bun.

Vì gói được cài thẳng từ GitHub và không publish lên npm, hãy chạy `bun run build` và **commit thư mục `dist/`** trước khi push, để người cài nhận được bản đã build.

### Cấu trúc dự án

```
├── src/
│   ├── index.ts                  # Entry chính: export client, lỗi, type
│   ├── callback.ts               # Entry /callback: handleOAuth2PopupCallback()
│   ├── idp-oauth2-client.ts      # Lớp IdpOAuth2Client
│   ├── types.ts                  # Type và hằng số dùng chung
│   ├── constants.ts              # Giá trị mặc định, tiền tố state
│   └── utils/
│       ├── base64url.util.ts     # Mã hóa/giải mã base64url, sinh chuỗi ngẫu nhiên
│       ├── pkce.util.ts          # Sinh code_verifier / code_challenge (S256)
│       ├── discovery.util.ts     # Lấy OIDC discovery document
│       ├── id-token.util.ts      # Giải mã và kiểm tra claim của id_token
│       ├── pending-flow.store.ts # Lưu phiên đăng nhập đang chờ (sessionStorage)
│       ├── popup.util.ts         # Mở popup, chờ message, các lỗi popup
│       ├── popup-callback.util.ts      # Chuyển kết quả từ popup về cửa sổ gốc
│       └── redirect-callback.util.ts   # Đọc và làm sạch tham số callback trên URL
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── vitest.config.ts
```

Mỗi file trong `src/` đều có file `.test.ts` đi kèm.
