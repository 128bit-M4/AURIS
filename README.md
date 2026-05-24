AURISをご覧いただきありがとうございます。
こちらのドキュメントではシステムやコーディングに興味のある方や、すでに実践されている方に向けてAURISの内部設計やUIについて軽くまとめておこうと思います。

AURIS 1.1 システム設計

1. システム概要

プラットフォーム: Electron（Mac版のみIntel/Apple Siliconで動作確認済み）

コアエンジン: Web Audio API 

UIスタック: HTML5, CSS3 (変数によるスキン対応), JavaScript

外部依存: yt-dlp (YouTube等からのインポート用) 

2. オーディオ処理エンジン (Web Audio API 実装)

32-bit フローティングポイント処理: 全信号経路での高精度な演算。

プロフェッショナル・シグナルチェーン:

ダイナミクス: コンプレッサー、リミッター、ノイズゲート。

EQシステム:

10バンド/31バンド可変グラフィックEQ。

4バンド・パラメトリックEQ (Low Shelf, Low Mid, High Mid, High Shelf)。

空間オーディオ (3D Spatial):

HRTF (頭部伝達関数) に基づく全方位3D定位。

室内音響シミュレーション (コンボリューション・リバーブ)。

クロスフィード処理: ヘッドフォンリスニング時の疲労を軽減するバイノーラル補正。

3. 独自機能のアルゴリズム仕様

UHQ Upscaler (知覚的ハイレゾ処理):

Harmonic Exciter: WaveShaperNode を使用した非線形歪みにより、MP3等で失われた高域倍音を知覚的に補完。

14
Air Band Extension: 14kHz以上の超高域を強調。

Age EQ (加齢性難聴補正):

ISO 7029 モデル: 加齢による高域感度低下曲線を逆補正するアルゴリズム。


Time Slip Listening (音響時代シミュレーター):

蓄音機 (1900s)、AMラジオ (1920s)、カセット (1970s) 等の特性を、HPF/LPF、歪み、Wow/Flutter（ピッチの揺らぎ）、特有のノイズ合成で再現。

リアルタイム解析:
FFTによるスペクトラムアナライザー、オシロスコープ、位相計（Phase Correlation Meter）、LUFSラウドネス履歴計。

4. メタデータおよび外部連携仕様

歌詞エンジン (5段フォールバック):

Musixmatch: Richsync (単語レベルのタイミング) 対応。

Lrclib: 同期歌詞 (LRC) 優先取得。

Utaten / J-Lyric: 国内J-POPソースのスクレイピング解析。

Lyrics.ovh: 海外曲フォールバック。

アートワーク取得: iTunes Search API からの高解像度サムネイル取得機能。

メディア解析: 音楽ファイルのID3タグ (v2.3/v2.4) および MP4 (iTunesメタデータ) のバイナリ解析によるアートワーク・タグ抽出。

5. ファイルシステムおよびインポート

サポートフォーマット: MP3, AAC, M4A, FLAC, WAV, OGG, OPUS, MP4, MOV, WEBM。

フォルダ・バッチ処理: ディレクトリ一括読み込みおよびプレイリスト (M3U) の保存・読み込み。

YouTube インポート: yt-dlp を介した音声抽出とローカルキャッシュ再生。


動作保証：MacOS 12.0~最新OS　2014年以降発売のApple Macのハードウェア
CPU:i5以上　RAM:8GB以上　SSD空き容量2GB以上
（テスト端末：端末A：Apple M4(10コアCPU/10コアGPUモデル) RAM24GB　内蔵SSD512GB
 　　　　　　 端末B：intel-core-i5、RAM8GB、内蔵Fusion Drive 1TB、USB3.0接続SSD1TB）

最終更新

2026,03,14(Sat)19:04

リリース
2026,05,24(Sun)16:24

ーーーーーーー新機能ーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーー


新機能はアップデート公開次第まとめていきます
