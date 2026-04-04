// src/data/serviceDictionary.ts
import { IconType } from 'react-icons';
import { 
  Globe, Mail, Cloud, Users, Tv, ShoppingCart, Gamepad2 
} from 'lucide-react';
import { 
  FaAws, FaMicrosoft, FaYahoo, FaLinkedin, FaAmazon, FaXbox 
} from 'react-icons/fa';
import {
  SiGithub, SiGitlab, SiBitbucket, SiVercel, SiNetlify,
  SiDigitalocean, SiGooglecloud, SiCloudflare, SiDocker,
  SiHeroku, SiStackoverflow, SiFigma, SiAtlassian, SiJira, SiLinear,
  SiNotion, SiSlack, SiDiscord,
  SiGmail, SiProtonmail, SiIcloud,
  SiEvernote, SiDropbox, SiGoogledrive,
  SiBox, SiZoom, SiGooglemeet,
  SiX, SiFacebook, SiInstagram, SiReddit, SiTiktok,
  SiSnapchat, SiPinterest, SiTumblr, SiMastodon, SiBluesky,
  SiNetflix, SiYoutube, SiTwitch, SiSpotify, SiApplemusic, SiSoundcloud, SiPandora,
  SiCrunchyroll, SiPlex,
  SiEbay, SiWalmart, SiTarget, SiEtsy,
  SiAliexpress, SiShopify, SiIkea,
  SiPaypal, SiStripe, SiSquare, SiAmericanexpress, SiDiscover,
  SiCoinbase, SiBinance, SiRobinhood,
  SiAirbnb, SiBookingdotcom, SiExpedia, SiUber, SiLyft, SiTripadvisor,
  SiSteam, SiEpicgames, SiPlaystation, SiEa,
  SiUbisoft, SiBattledotnet
} from 'react-icons/si';

export interface ServiceTemplate {
  name: string;
  url: string;
  icon?: IconType | typeof Globe;
  brandColor?: string;
}

export const popularServices: ServiceTemplate[] = [
  // Tech & Developer
  { name: 'GitHub', url: 'https://github.com', icon: SiGithub, brandColor: '#181717' },
  { name: 'GitLab', url: 'https://gitlab.com', icon: SiGitlab, brandColor: '#FC6D26' },
  { name: 'Bitbucket', url: 'https://bitbucket.org', icon: SiBitbucket, brandColor: '#0052CC' },
  { name: 'Vercel', url: 'https://vercel.com', icon: SiVercel, brandColor: '#000000' },
  { name: 'Netlify', url: 'https://netlify.com', icon: SiNetlify, brandColor: '#00C7B7' },
  { name: 'AWS', url: 'https://aws.amazon.com', icon: FaAws, brandColor: '#232F3E' }, // Fixed
  { name: 'DigitalOcean', url: 'https://digitalocean.com', icon: SiDigitalocean, brandColor: '#0080FF' },
  { name: 'Google Cloud', url: 'https://cloud.google.com', icon: SiGooglecloud, brandColor: '#4285F4' },
  { name: 'Microsoft Azure', url: 'https://azure.microsoft.com', icon: FaMicrosoft, brandColor: '#0089D6' }, // Fixed
  { name: 'Cloudflare', url: 'https://cloudflare.com', icon: SiCloudflare, brandColor: '#F38020' },
  { name: 'Docker', url: 'https://hub.docker.com', icon: SiDocker, brandColor: '#2496ED' },
  { name: 'Heroku', url: 'https://heroku.com', icon: SiHeroku, brandColor: '#430098' },
  { name: 'Stack Overflow', url: 'https://stackoverflow.com', icon: SiStackoverflow, brandColor: '#F58025' },
  { name: 'Figma', url: 'https://figma.com', icon: SiFigma, brandColor: '#F24E1E' },
  { name: 'Atlassian', url: 'https://atlassian.com', icon: SiAtlassian, brandColor: '#0052CC' },
  { name: 'Jira', url: 'https://jira.atlassian.com', icon: SiJira, brandColor: '#0052CC' },
  { name: 'Linear', url: 'https://linear.app', icon: SiLinear, brandColor: '#5E6AD2' },
  { name: 'Notion', url: 'https://notion.so', icon: SiNotion, brandColor: '#000000' },
  { name: 'Slack', url: 'https://slack.com', icon: SiSlack, brandColor: '#4A154B' },
  { name: 'Discord', url: 'https://discord.com', icon: SiDiscord, brandColor: '#5865F2' },
  
  // Email & Productivity
  { name: 'Gmail', url: 'https://mail.google.com', icon: SiGmail, brandColor: '#EA4335' },
  { name: 'Outlook', url: 'https://outlook.live.com', icon: Mail, brandColor: '#0078D4' }, // Fixed
  { name: 'Yahoo Mail', url: 'https://mail.yahoo.com', icon: FaYahoo, brandColor: '#6001D2' }, // Fixed
  { name: 'ProtonMail', url: 'https://proton.me', icon: SiProtonmail, brandColor: '#6D4AFF' },
  { name: 'iCloud', url: 'https://icloud.com', icon: SiIcloud, brandColor: '#3693F3' },
  { name: 'Google Workspace', url: 'https://workspace.google.com', icon: Users, brandColor: '#4285F4' }, // Fixed
  { name: 'Microsoft 365', url: 'https://www.office.com', icon: FaMicrosoft, brandColor: '#D83B01' }, // Fixed
  { name: 'Evernote', url: 'https://evernote.com', icon: SiEvernote, brandColor: '#00A82D' },
  { name: 'Dropbox', url: 'https://dropbox.com', icon: SiDropbox, brandColor: '#0061FF' },
  { name: 'Google Drive', url: 'https://drive.google.com', icon: SiGoogledrive, brandColor: '#4285F4' },
  { name: 'OneDrive', url: 'https://onedrive.live.com', icon: Cloud, brandColor: '#0078D4' }, // Fixed
  { name: 'Box', url: 'https://box.com', icon: SiBox, brandColor: '#0061D5' },
  { name: 'Zoom', url: 'https://zoom.us', icon: SiZoom, brandColor: '#2D8CFF' },
  { name: 'Google Meet', url: 'https://meet.google.com', icon: SiGooglemeet, brandColor: '#00897B' },
  { name: 'Microsoft Teams', url: 'https://teams.microsoft.com', icon: Users, brandColor: '#6264A7' }, // Fixed

  // Social Media
  { name: 'X (Twitter)', url: 'https://x.com', icon: SiX, brandColor: '#000000' },
  { name: 'Facebook', url: 'https://facebook.com', icon: SiFacebook, brandColor: '#1877F2' },
  { name: 'Instagram', url: 'https://instagram.com', icon: SiInstagram, brandColor: '#E4405F' },
  { name: 'LinkedIn', url: 'https://linkedin.com', icon: FaLinkedin, brandColor: '#0A66C2' }, // Fixed
  { name: 'Reddit', url: 'https://reddit.com', icon: SiReddit, brandColor: '#FF4500' },
  { name: 'TikTok', url: 'https://tiktok.com', icon: SiTiktok, brandColor: '#000000' },
  { name: 'Snapchat', url: 'https://snapchat.com', icon: SiSnapchat, brandColor: '#FFFC00' },
  { name: 'Pinterest', url: 'https://pinterest.com', icon: SiPinterest, brandColor: '#BD081C' },
  { name: 'Tumblr', url: 'https://tumblr.com', icon: SiTumblr, brandColor: '#36465D' },
  { name: 'Mastodon', url: 'https://joinmastodon.org', icon: SiMastodon, brandColor: '#6364FF' },
  { name: 'Bluesky', url: 'https://bsky.app', icon: SiBluesky, brandColor: '#0285FF' },

  // Entertainment & Streaming
  { name: 'Netflix', url: 'https://netflix.com', icon: SiNetflix, brandColor: '#E50914' },
  { name: 'Hulu', url: 'https://hulu.com', icon: Tv, brandColor: '#1CE783' }, // Fixed
  { name: 'Disney+', url: 'https://disneyplus.com', icon: Tv, brandColor: '#113CCF' }, // Fixed
  { name: 'Amazon Prime Video', url: 'https://primevideo.com', icon: FaAmazon, brandColor: '#00A8E1' }, // Fixed
  { name: 'YouTube', url: 'https://youtube.com', icon: SiYoutube, brandColor: '#FF0000' },
  { name: 'Twitch', url: 'https://twitch.tv', icon: SiTwitch, brandColor: '#9146FF' },
  { name: 'Spotify', url: 'https://spotify.com', icon: SiSpotify, brandColor: '#1DB954' },
  { name: 'Apple Music', url: 'https://music.apple.com', icon: SiApplemusic, brandColor: '#FA243C' },
  { name: 'SoundCloud', url: 'https://soundcloud.com', icon: SiSoundcloud, brandColor: '#FF3300' },
  { name: 'Pandora', url: 'https://pandora.com', icon: SiPandora, brandColor: '#224099' },
  { name: 'Crunchyroll', url: 'https://crunchyroll.com', icon: SiCrunchyroll, brandColor: '#F47521' },
  { name: 'Plex', url: 'https://plex.tv', icon: SiPlex, brandColor: '#E5A00D' },

  // Shopping & E-commerce
  { name: 'Amazon', url: 'https://amazon.com', icon: FaAmazon, brandColor: '#FF9900' }, // Fixed
  { name: 'eBay', url: 'https://ebay.com', icon: SiEbay, brandColor: '#E53238' },
  { name: 'Walmart', url: 'https://walmart.com', icon: SiWalmart, brandColor: '#0071CE' },
  { name: 'Target', url: 'https://target.com', icon: SiTarget, brandColor: '#CC0000' },
  { name: 'Best Buy', url: 'https://bestbuy.com', icon: ShoppingCart, brandColor: '#0046BE' }, // Fixed
  { name: 'Etsy', url: 'https://etsy.com', icon: SiEtsy, brandColor: '#F1641E' },
  { name: 'AliExpress', url: 'https://aliexpress.com', icon: SiAliexpress, brandColor: '#FF4724' },
  { name: 'Shopify', url: 'https://shopify.com', icon: SiShopify, brandColor: '#96BF48' },
  { name: 'Wayfair', url: 'https://wayfair.com', icon: ShoppingCart, brandColor: '#7F187F' }, // Fixed
  { name: 'Home Depot', url: 'https://homedepot.com', icon: ShoppingCart, brandColor: '#F96302' }, // Fixed
  { name: 'IKEA', url: 'https://ikea.com', icon: SiIkea, brandColor: '#0051BA' },

  // Finance & Crypto
  { name: 'PayPal', url: 'https://paypal.com', icon: SiPaypal, brandColor: '#00457C' },
  { name: 'Stripe', url: 'https://stripe.com', icon: SiStripe, brandColor: '#008CDD' },
  { name: 'Square', url: 'https://squareup.com', icon: SiSquare, brandColor: '#3E4348' },
  { name: 'American Express', url: 'https://americanexpress.com', icon: SiAmericanexpress, brandColor: '#002663' },
  { name: 'Discover', url: 'https://discover.com', icon: SiDiscover, brandColor: '#FF6000' },
  { name: 'Coinbase', url: 'https://coinbase.com', icon: SiCoinbase, brandColor: '#0052FF' },
  { name: 'Binance', url: 'https://binance.com', icon: SiBinance, brandColor: '#F0B90B' },
  { name: 'Kraken', url: 'https://kraken.com', icon: Globe, brandColor: '#5741D9' }, // Fixed
  { name: 'Robinhood', url: 'https://robinhood.com', icon: SiRobinhood, brandColor: '#00C805' },

  // Travel & Booking
  { name: 'Airbnb', url: 'https://airbnb.com', icon: SiAirbnb, brandColor: '#FF5A5F' },
  { name: 'Booking.com', url: 'https://booking.com', icon: SiBookingdotcom, brandColor: '#003580' },
  { name: 'Expedia', url: 'https://expedia.com', icon: SiExpedia, brandColor: '#00008F' },
  { name: 'Uber', url: 'https://uber.com', icon: SiUber, brandColor: '#000000' },
  { name: 'Lyft', url: 'https://lyft.com', icon: SiLyft, brandColor: '#FF00BF' },
  { name: 'TripAdvisor', url: 'https://tripadvisor.com', icon: SiTripadvisor, brandColor: '#34E0A1' },

  // Gaming
  { name: 'Steam', url: 'https://store.steampowered.com', icon: SiSteam, brandColor: '#000000' },
  { name: 'Epic Games', url: 'https://store.epicgames.com', icon: SiEpicgames, brandColor: '#313131' },
  { name: 'PlayStation Network', url: 'https://playstation.com', icon: SiPlaystation, brandColor: '#003791' },
  { name: 'Xbox Live', url: 'https://xbox.com', icon: FaXbox, brandColor: '#107C10' }, // Fixed
  { name: 'Nintendo', url: 'https://nintendo.com', icon: Gamepad2, brandColor: '#E60012' }, // Fixed
  { name: 'EA', url: 'https://ea.com', icon: SiEa, brandColor: '#000000' },
  { name: 'Ubisoft', url: 'https://ubisoft.com', icon: SiUbisoft, brandColor: '#000000' },
  { name: 'Battle.net', url: 'https://battle.net', icon: SiBattledotnet, brandColor: '#00AEFF' }
];