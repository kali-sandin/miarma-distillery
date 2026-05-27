from PIL import Image, ImageDraw
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
IMG = ROOT / 'img'
IMG.mkdir(exist_ok=True)
S=4
W,H=270,480
img=Image.new('RGB',(W,H),(82,119,68))
d=ImageDraw.Draw(img)
# palette
soil=(126,86,48); soil2=(146,102,57); grass=(72,128,72); path=(187,151,93); wall=(113,80,58); floor=(163,132,91); stone=(119,119,105)
roof=(117,54,43); wood=(122,74,38); water=(76,132,164); metal=(132,139,139); shadow=(54,55,50); gold=(199,143,56)
# global roads / paths
d.rectangle([0,0,W,H], fill=(70,122,70))
d.rectangle([86,0,94,H], fill=path)
d.rectangle([176,0,184,H], fill=path)
d.rectangle([0,330,W,342], fill=path)
for x in range(0,W,8): d.line([(x,336),(x+3,336)], fill=(160,126,78))
# left crop fields
left=[4,26,84,326]
d.rectangle(left, fill=(103,128,65))
# field tiles leaving margins
for r in range(6):
    for c in range(3):
        x=10+c*23; y=48+r*43
        col=soil if (r+c)%2 else soil2
        d.rectangle([x,y,x+17,y+31], fill=col, outline=(91,69,44))
        for yy in range(y+5,y+29,7): d.line([(x+2,yy),(x+15,yy)], fill=(96,67,42))
# top indicator terrace decorative
d.rectangle([7,8,83,24], fill=(48,72,55), outline=(36,50,39))
for x in [12,29,46,63]: d.rectangle([x,13,x+12,18], fill=(174,133,61), outline=(66,55,43))
# tractor/detail
d.rectangle([54,292,73,304], fill=(169,47,35), outline=(70,41,35)); d.rectangle([62,284,70,292], fill=(196,64,45)); d.ellipse([52,301,60,309], fill=shadow); d.ellipse([67,301,77,311], fill=shadow)
# office exterior bottom-left
d.rectangle([11,360,80,442], fill=(87,117,91), outline=shadow)
d.polygon([(9,360),(45,330),(82,360)], fill=roof, outline=(72,41,36))
d.rectangle([23,376,67,431], fill=(193,153,95), outline=wall)
d.rectangle([42,402,53,431], fill=(80,55,39), outline=shadow)
for x in [28,56]: d.rectangle([x,385,x+8,396], fill=(96,150,177), outline=(65,84,91))
d.rectangle([18,437,74,444], fill=stone)
# rooms helper roofless interiors
def room(x1,y1,x2,y2, fill=floor, wallc=wall, grid=False):
    d.rectangle([x1,y1,x2,y2], fill=fill)
    # thick walls
    d.rectangle([x1,y1,x2,y1+4], fill=wallc); d.rectangle([x1,y2-4,x2,y2], fill=wallc)
    d.rectangle([x1,y1,x1+4,y2], fill=wallc); d.rectangle([x2-4,y1,x2,y2], fill=wallc)
    # door gaps
    d.rectangle([(x1+x2)//2-6,y2-4,(x1+x2)//2+6,y2], fill=fill)
    # windows
    for xx in range(x1+13,x2-12,24): d.rectangle([xx,y1+1,xx+7,y1+3], fill=(104,162,190))
    if grid:
        for xx in range(x1+12,x2-5,14): d.line([(xx,y1+8),(xx,y2-8)], fill=(145,113,80))
        for yy in range(y1+15,y2-5,14): d.line([(x1+8,yy),(x2-8,yy)], fill=(145,113,80))
# middle upper two rooms: malting / fermentation empty
room(98,26,172,158, fill=(169,139,92), grid=True)
# interior stair/drain details only
d.rectangle([107,37,130,43], fill=(130,98,63)); d.rectangle([107,47,130,53], fill=(130,98,63)); d.rectangle([107,57,130,63], fill=(130,98,63))
d.rectangle([148,122,160,137], fill=(100,112,95), outline=(72,76,63))
room(98,164,172,238, fill=(156,126,86))
d.rectangle([104,176,116,190], fill=stone); d.line([(106,207),(164,207)], fill=(130,92,63)); d.rectangle([154,176,164,189], fill=(95,139,164))
# middle lower barrel aging warehouses empty
room(96,248,174,440, fill=(136,106,74), grid=True)
for yy in [280,318,356,394]: d.line([(106,yy),(164,yy)], fill=(105,73,48), width=2)
# right upper stillhouse empty roofless
room(188,26,264,238, fill=(154,126,91))
d.rectangle([198,42,254,49], fill=(99,87,78)); d.rectangle([198,61,254,68], fill=(99,87,78))
d.rectangle([204,191,222,213], fill=(91,91,83), outline=shadow); d.rectangle([232,188,252,213], fill=(91,91,83), outline=shadow)
for x in [204,232]: d.rectangle([x+4,195,x+13,207], fill=(112,150,169))
# right lower bottling/shop/loading complete
room(188,248,264,414, fill=(168,132,86))
# shop counter/shelves, free floor, conveyor
d.rectangle([195,262,222,276], fill=(131,82,46), outline=shadow)
for x in range(198,220,7): d.rectangle([x,265,x+3,271], fill=(214,178,80))
d.rectangle([198,327,254,334], fill=metal, outline=(80,86,87))
for x in range(201,252,9): d.ellipse([x,328,x+4,332], fill=(80,86,87))
d.rectangle([230,287,254,310], fill=(111,78,52), outline=shadow)
d.rectangle([194,350,256,407], fill=(179,145,98), outline=(122,82,50))
# loading docks and trucks bottom right
d.rectangle([184,414,268,472], fill=(94,91,83))
for x in [194,224,254]:
    d.rectangle([x,411,x+20,421], fill=(86,68,58))
    d.rectangle([x-2,427,x+24,459], fill=(221,211,184), outline=shadow)
    d.rectangle([x+24,436,x+38,456], fill=(151,42,35), outline=shadow)
    d.rectangle([x+27,440,x+34,446], fill=(103,158,184))
    d.ellipse([x+2,456,x+9,463], fill=shadow); d.ellipse([x+26,456,x+33,463], fill=shadow)
# decorative casks/sign no labels
for x,y in [(184,238),(91,238),(176,442),(2,442)]: d.rectangle([x,y,x+8,y+8], fill=(66,80,61))
# pixel dither/noise
for y in range(0,H,2):
    for x in range(0,W,2):
        if (x*17+y*13)%97<4:
            r,g,b=img.getpixel((x,y)); d.point((x,y), fill=(max(0,r-8),max(0,g-8),max(0,b-8)))
# upscale
img = img.resize((1080,1920), Image.Resampling.NEAREST)
img.save(IMG/'finca.png')
# placeholder sprites
def sprite(name, drawfn, size=(96,96)):
    im=Image.new('RGBA', size, (0,0,0,0)); dd=ImageDraw.Draw(im); drawfn(dd,size); im.save(IMG/name)
def barrel(dd,s):
    w,h=s; dd.ellipse([18,18,78,78], fill=(136,80,38), outline=(70,43,25), width=4); dd.rectangle([22,28,74,68], fill=(154,91,43), outline=(70,43,25), width=3); dd.line([28,30,28,66], fill=(210,167,87), width=3); dd.line([68,30,68,66], fill=(210,167,87), width=3)
def vat(dd,s):
    dd.ellipse([18,18,78,34], fill=(138,150,154), outline=(72,79,82), width=4); dd.rectangle([18,26,78,72], fill=(113,126,132), outline=(72,79,82), width=4); dd.ellipse([18,62,78,82], fill=(88,99,105), outline=(72,79,82), width=4)
def still(dd,s):
    dd.ellipse([18,42,57,82], fill=(194,103,39), outline=(94,51,28), width=4); dd.rectangle([30,23,45,49], fill=(205,124,47), outline=(94,51,28), width=3); dd.arc([42,22,88,58], 180, 330, fill=(209,139,67), width=5); dd.rectangle([68,48,82,75], fill=(151,80,40), outline=(94,51,28), width=3)
def box(dd,s):
    dd.rectangle([20,30,76,74], fill=(172,112,55), outline=(83,54,31), width=4); dd.line([20,44,76,44], fill=(117,72,39), width=3); dd.line([48,30,48,74], fill=(117,72,39), width=3)
def crop(dd,s):
    dd.rectangle([28,58,70,76], fill=(119,82,44));
    for x in [32,43,54,65]: dd.line([x,60,x-6,28], fill=(58,131,54), width=5); dd.ellipse([x-12,23,x+2,39], fill=(85,164,65))
def malt(dd,s):
    dd.rectangle([18,56,78,74], fill=(176,129,70), outline=(89,61,34), width=3)
    for x in range(24,74,10): dd.ellipse([x,42,x+9,61], fill=(222,181,83), outline=(128,91,42), width=2)
def spirit(dd,s):
    dd.polygon([(48,12),(68,68),(48,84),(28,68)], fill=(198,223,208), outline=(80,109,104)); dd.rectangle([39,6,57,18], fill=(119,181,174), outline=(80,109,104)); dd.rectangle([37,50,59,68], fill=(231,194,78))
for n,f in [('placeholder_barrel.png',barrel),('placeholder_vat.png',vat),('placeholder_still.png',still),('placeholder_box.png',box),('placeholder_crop.png',crop),('placeholder_malt.png',malt),('placeholder_spirit.png',spirit)]: sprite(n,f)
print(IMG/'finca.png')
