/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {setGlobalOptions} = require("firebase-functions");
const {onRequest} = require("firebase-functions/https");
const logger = require("firebase-functions/logger");

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 10 });

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

// host権限を設定するためのCallable Function (一時的に使用)
exports.setHostClaim = functions.https.onCall(async (data, context) => {
  // 認証されているか確認
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'この機能は認証されたユーザーのみが利用できます。');
  }

  // 渡されたUIDが現在の認証済みユーザーのUIDと一致するか確認 (自身の権限を設定するため)
  // もしくは、管理者だけが他人の権限を設定できるようにするなら、isHostをチェック
  const uid = context.auth.uid; // 呼び出し元のユーザーのUID
  const targetUid = data.uid; // 設定したいターゲットのUID (ここでは自分自身)

  if (uid !== targetUid) {
    throw new functions.https.HttpsError('permission-denied', '他のユーザーの権限を設定することはできません。');
  }

  try {
    // カスタムクレームを設定
    await admin.auth().setCustomUserClaims(uid, { host: true });
    console.log(`Custom claim 'host: true' set for user: ${uid}`);

    // 最新のIDトークンを強制的に再発行させる
    // これにより、ウェブアプリ側が新しいカスタムクレームをすぐに認識できるようになる
    await admin.auth().revokeRefreshTokens(uid); 

    return { result: `Custom claim 'host: true' set for user ${uid}. Please re-login on the client side.` };
  } catch (error) {
    console.error('Error setting custom claim:', error);
    throw new functions.https.HttpsError('internal', 'カスタムクレームの設定中にエラーが発生しました。', error.message);
  }
});

